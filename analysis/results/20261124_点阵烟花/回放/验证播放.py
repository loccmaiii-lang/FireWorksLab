"""以本机浏览器播放并读回实际序列/VAT，重建交付用 GIF 与成形对照。"""
import base64
import contextlib
import functools
import http.server
import io
import json
import sys
import threading
from pathlib import Path
from urllib.parse import quote

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
from scipy.spatial import cKDTree


RESULT = Path(__file__).resolve().parents[1]
HERE = RESULT.parents[1] / 'local' / RESULT.name
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 16)
large = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 20)


class Static(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def capture(page, frame, view='detail'):
    src = page.evaluate('''([frame, view]) => {
        const seek = document.querySelector('#seek');
        seek.value = frame;
        seek.dispatchEvent(new Event('input'));
        return [...document.querySelectorAll('canvas[data-view="' + view + '"]')].map(c => c.toDataURL());
    }''', [frame, view])
    return [Image.open(io.BytesIO(base64.b64decode(v.split(',')[1]))).convert('RGB') for v in src]


def label_frame(imgs, frame, fps):
    side = 352
    out = Image.new("RGB", (2*side+1, side+38), (22,24,28))
    draw = ImageDraw.Draw(out)
    for i, (im, label) in enumerate(zip(imgs, ['序列贴图 · PC', 'VAT'])):
        x = (side+1)*i
        out.paste(im.resize((side,side), Image.Resampling.LANCZOS), (x,38))
        draw.text((x+10,6), label, fill=(237,233,221), font=large)
    draw.text((2*side-65,9), f'{frame/fps:.2f} s', fill=(203,194,177), font=font)
    return out


def native_reference(browser, metadata):
    """从实际烘焙器页面重新发射同一张点表，与两份素材输入逐帧核对。"""
    scripts = RESULT.parents[1] / 'scripts'
    sys.path.insert(0, str(scripts))
    from browser_runtime import validation_url, verify_validation_source

    template = RESULT.parents[2] / 'tool' / 'FireworkBaker.html'
    url = validation_url(default=template.as_uri())
    verify_validation_source(url, template)
    with np.load(RESULT / 'shared/motion.npz') as motion:
        launch = motion['launch_shape_xy'].tolist()
        last = metadata['formation_frame']
        expected = motion['xy'][:last+1, :-1]
        groups = motion['group'][:-1]
    page = browser.new_page()
    try:
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("typeof Sim === 'function' && typeof defaultsFor === 'function'")
        trace = page.evaluate('''([points, fps, end]) => {
            const p = derive({...defaultsFor('kata').P}), key = '点阵回放验算';
            if (p.pattern !== 'heart') throw Error('型物默认模板已变化');
            shapeCache.set(key + '|' + points.length, points);
            const sim = new Sim({...p, pattern:'text', text:key, stars:points.length});
            const frames = [];
            for (let i=0; i<=end; i++) {
                while (sim.t < i/fps-1e-9) sim.step(H_STEP);
                frames.push(sim.all.map(star => [star.x, star.y]));
            }
            return frames;
        }''', [launch, metadata['fps'], last])
    finally:
        page.close()
    xy = (np.array(trace) * [1,-1] * metadata['native_simulation']['uvPerMetre']
          + metadata['flash']['center_uv'])
    max_error = np.linalg.norm(xy - expected, axis=2).max() * 512
    assert max_error < 0.0001, max_error
    return xy, groups, float(max_error)


def check_pixels(image, uv, half_radius_uv):
    # 起爆时相邻灯芯连成亮线，局部极大值无法代表线上全部星点。直接验亮核像素的覆盖。
    light = np.asarray(image).max(axis=2)
    cores = np.argwhere(light > 180)[:, ::-1] + 0.5
    assert len(cores) > 0
    expected = np.asarray(uv) * image.size
    off_path = float(np.percentile(cKDTree(expected).query(cores)[0], 95))
    missing = float(np.percentile(cKDTree(cores).query(expected)[0], 95))
    # 重叠亮核加色后可超过单星半高半径。给两倍实测半径，点心到亮像素限一格对角线。
    assert off_path < 2 * half_radius_uv * image.width and missing < np.sqrt(2), (off_path, missing)
    return dict(core_pixels=len(cores), core_to_sim_px95=round(off_path, 3), sim_to_core_px95=round(missing, 3))


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    errors = []
    handler = functools.partial(Static, directory=RESULT)
    with http.server.ThreadingHTTPServer(('127.0.0.1',0), handler) as server, sync_playwright() as pw:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        with contextlib.ExitStack() as stack:
            # 仅验证这份独立的样例查看器，不访问或驱动 UE 客户端。
            browser = pw.chromium.launch(channel='msedge', headless=True, args=['--enable-unsafe-swiftshader'])
            stack.callback(browser.close)
            page = browser.new_page(viewport={'width':1200,'height':920}, device_scale_factor=1)
            page.on('pageerror', lambda problem: errors.append(str(problem)))
            page.goto('http://127.0.0.1:%d/%s' % (server.server_port, quote('双方案对照.html')))
            page.wait_for_function("!document.querySelector('#play').disabled || document.querySelector('#error').textContent")
            assert page.locator('#error').inner_text() == '', page.locator('#error').inner_text()
            assert page.locator('#scale').input_value() == '1000'
            assert page.locator('#platform').input_value() == 'pc'
            assert page.locator('#play').inner_text() == '暂停'
            page.wait_for_function("Number(document.querySelector('#seek').value)>0")
            timeline = page.evaluate('window.rabbitTimeline')
            count, fps, hold = timeline['frames'], timeline['fps'], timeline['holdFrame']
            assert int(page.locator('#seek').get_attribute('max')) == count-1
            held = capture(page,hold)
            assert [im.size for im in held] == [(352,352)] * 2
            page.screenshot(path=str(HERE / '放大对照.png'))
            results = {}
            metadata = json.loads((RESULT / 'shared/metadata.json').read_text(encoding='utf8'))
            xy, groups, err = native_reference(browser, metadata)
            results['实际烘焙器逐星对照'] = dict(frames=len(xy), points=len(groups), max_error_512px=err)
            layers = page.evaluate('window.rabbitBakerData.pc.map(l => [l.frames,l.gain])')
            radius_uv = metadata['extraction']['measured_half_height_radius_median_px'] / metadata['source_pixels_per_uv_unit']
            results['实际开花亮核'] = {}
            for tick in (3, 6, 18, 30, metadata['formation_frame']):
                baker, vat = capture(page, tick)
                # 图集在两次取样间沿用上一格，取每个实际素材格首次显示的 tick。
                per_color = []
                for group, (tiles, gain) in enumerate(layers):
                    start = next(i for i in range(tick+1) if tiles[i] == tiles[tick] and gain[i] > 0)
                    per_color.extend(xy[start, groups == group])
                results['实际开花亮核'][tick] = dict(baker=check_pixels(baker, per_color, radius_uv),
                                                   vat=check_pixels(vat, xy[tick], radius_uv))
            for distance in [800,1000,1200]:
                page.select_option('#scale', str(distance))
                frames = capture(page,hold,'game')
                results[str(distance)] = {'canvas': frames[0].width, 'litPixelsOver80': [int((np.asarray(im).max(axis=2)>80).sum()) for im in frames]}
                assert min(results[str(distance)]['litPixelsOver80']) > 200
                assert frames[0].width == {800:136,1000:109,1200:91}[distance]
                assert all(np.array_equal(now, old) for now,old in zip(capture(page,hold), held))
                if distance == 1000:
                    page.screenshot(path=str(HERE / '1000米对照.png'))
                    true_size = frames
            page.select_option('#platform','mobile')
            mobile, _ = capture(page,hold,'game')
            assert np.array_equal(np.asarray(mobile)[:,:,0],np.asarray(mobile)[:,:,2])
            mobile_tail = [int(np.asarray(capture(page,i,'game')[0]).max()) for i in range(count-6,count)]
            assert mobile_tail[-1] == 0 and max(mobile_tail[:-1]) > 0
            results['手机末段峰值'] = mobile_tail
            page.select_option('#scale','1000')
            page.select_option('#platform','pc')
            page.click('#restart')
            page.wait_for_function("Number(document.querySelector('#seek').value)>5")
            page.click('#play')
            assert page.locator('#play').inner_text() == '播放'
            # 观察真实播放动作的每次进度更新，检查慢帧没有跨过末段、结束后仍可重播。
            page.evaluate('''() => {
                const slider = document.querySelector('#seek');
                const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                window.presentedFrames = [];
                Object.defineProperty(slider, 'value', {
                    get() { return value.get.call(this); },
                    set(v) { window.presentedFrames.push(Number(v)); value.set.call(this,v); }
                });
            }''')
            page.click('#restart')
            page.wait_for_function("document.querySelector('#time').textContent.includes('已播完')")
            presented = page.evaluate('window.presentedFrames')
            assert sorted(set(presented)) == list(range(count)) and np.all(np.diff(presented) >= 0)
            assert page.locator('#baker').is_visible() and page.locator('#vat').is_visible()
            page.wait_for_function("Number(document.querySelector('#seek').value)>0 && Number(document.querySelector('#seek').value)<10")
            replayed = page.evaluate('window.presentedFrames')
            assert [count-1,0] in [replayed[i:i+2] for i in range(len(replayed)-1)]
            page.click('#play')
            sequence, peaks, energy = [], [], []
            for i in range(count):
                pair = capture(page,i)
                peaks.append([int(np.asarray(im).max()) for im in pair])
                energy.append([int(np.asarray(im,dtype=np.int64).sum()) for im in pair])
                sequence.append(label_frame(pair,i,fps))
            assert peaks[-1] == [0,0] and min(peaks[0]) > 0
            for channel in range(2):
                assert any(0 < v[channel] <= 30 for v in peaks[-15:-1]), peaks[-15:]
                assert energy[-12][channel] > energy[-5][channel] >= energy[-1][channel]
            results['播放'] = dict(frames=count,fps=fps,presented=len(set(presented)),
                                  last_eight_peaks=peaks[-8:],last_eight_energy=energy[-8:])
            checkpoints = [round(.2*fps), round(.5*fps), round(.7*fps), round(.9*fps), hold, round(2.8*fps)]
            contact = Image.new('RGB',(2*500,3*278),(16,17,18))
            for j,key in enumerate(checkpoints):
                contact.paste(sequence[key].resize((500,277),Image.Resampling.LANCZOS),
                              ((j%2)*500, (j//2)*278))
            contact.save(HERE/'起势与消散复核.png')
            # GIF 以 10ms 为单位，额外停一小段真实黑场再重播。
            durations = [10*(round((i+1)*100/fps)-round(i*100/fps)) for i in range(count)]
            durations[-1] += 650
            sequence[0].save(RESULT/'同帧回放.gif', save_all=True, append_images=sequence[1:], loop=0,
                             duration=durations, optimize=True)
            with Image.open(RESULT/'同帧回放.gif') as gif:
                assert gif.n_frames == count
                gif.seek(count-1)
                for left in (0, 353):
                    assert gif.crop((left,38,left+352,390)).convert('L').getextrema() == (0,0)
            width, height = 754, 545
            sheet = Image.new('RGB',(width,height),(22,24,28))
            draw = ImageDraw.Draw(sheet)
            for i in range(2):
                x = 12+i*373
                draw.text((x,8), ('序列贴图 · PC' if i == 0 else 'VAT'), fill='#f3eddc',font=large)
                sheet.paste(held[i].resize((356,356),Image.Resampling.LANCZOS),(x,42))
                draw.text((x,406),'1000 米 · 1080p 标定',font=font,fill='#c4c9d1')
                sheet.paste(true_size[i],(x,433))
            sheet.save(RESULT/'成形对照.png')
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            # 从同一交付入口重新载入，复核默认状态和减少动态效果的设置。
            page.reload()
            page.wait_for_function("!document.querySelector('#play').disabled || document.querySelector('#error').textContent")
            assert page.locator('#error').inner_text() == ''
            assert all(np.asarray(im).max() > 160 for im in capture(page,hold))
            assert all(np.asarray(im).max() == 0 for im in capture(page,count-1))
            page.select_option('#platform','mobile')
            page.select_option('#scale','800')
            page.emulate_media(reduced_motion='reduce')
            page.reload()
            page.wait_for_function("!document.querySelector('#play').disabled")
            assert page.locator('#play').inner_text() == '播放' and page.locator('#seek').input_value() == '0'
            assert page.locator('#platform').input_value() == 'pc' and page.locator('#scale').input_value() == '1000'
            # 即使时长相等，缓存中不同修订的素材也不能并排交付。
            page.add_init_script("""Object.defineProperty(window, 'rabbitVATAssets', {
                set(data) { data.sourceMotionSHA256 = '旧版'; this.testVat = data; },
                get() { return this.testVat; }
            });""")
            page.reload()
            page.wait_for_function("document.querySelector('#error')?.textContent.includes('版本不一致')")
            assert page.locator('#play').is_disabled()
            assert not errors, errors
            print(json.dumps(results))
            (HERE/'独立回放检查.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
        server.shutdown()


if __name__ == '__main__':
    main()
