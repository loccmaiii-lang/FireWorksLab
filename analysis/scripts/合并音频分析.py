#!/usr/bin/env python3
"""合并音频（VO 倒计时 + 汪洋与浩渺）测量（跨年秀 22，用户 10-13 16:28）。

用户：「VO段总时长为16秒，汪洋与浩渺从VO段01秒开始播放，第16秒敲钟播放，VO段前6秒是说闲话，后10秒是vo喊倒计时」
做法：
  ① 原曲起点：合并文件和仓库原曲（协作/编排工作台资料/2026-10-10/music/music.wav）在 44.1 kHz 互相关，取峰值。
  ② VO：按 0.5 s 一段最小二乘求原曲音量，把原曲从合并文件里减掉，剩下的（300–3500 Hz）就是 VO；10 ms 一帧找连续出声的段。
  ③ 小节网格：原曲分析（汪洋与浩渺_高潮分析.json）的第 0 小节在原曲 0.18 s、一小节 1.6216 s，换到演出秒 = 原曲起点 + 0.18 + 1.6216·k。
  ④ 闲话 / 倒计时 / 点火（10-13 20:38 改）：间隔 < 0.1 s 的段并成一个词；--count-from（默认 3.0 s）以后最后一个词是「点火」，前 10 个是 10→1。
     原来按「前 6 秒闲话」把 6 s 以后的 10 段当 10→1，错了两个数：用户听出「网页大数字 6 时 VO 喊 10、5 时喊 9」（10 在 4.26 s、9 在 5.55 s），
     「点火的时候是 P4」——16.20–16.85 s 中间有个小停顿，是两个字的「点火」，不是 2 和 1。11 个起音间隔都在 0.9–1.7 s，是同一串。
  ⑤ 零点：默认 = 「点火」起音（用户 20:38「测试提前一秒」：比原来的原曲第 10 小节重拍 17.19 s 早约 1 s）；也记下重拍时刻，可用 --zero 指定。
用法：python3 -I analysis/scripts/合并音频分析.py <合并音频> [--music 原曲.wav] [--zero 秒] [--count-from 秒] [--out analysis/music/合并音频_VO倒计时.json]
需要 ffmpeg、numpy、scipy。
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfiltfilt

ROOT = Path(__file__).resolve().parents[2]
SR = 44100


def decode(path, seconds=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path)] + (['-t', str(seconds)] if seconds else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, check=True, capture_output=True).stdout, dtype=np.float32).copy()


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mix')
    ap.add_argument('--music', default=str(ROOT / '协作/编排工作台资料/2026-10-10/music/music.wav'))
    ap.add_argument('--zero', type=float, default=None)
    ap.add_argument('--count-from', type=float, default=3.0, help='这一秒以后的词才算倒计时（闲话在它前面）')
    ap.add_argument('--out', default=str(ROOT / 'analysis/music/合并音频_VO倒计时.json'))
    a = ap.parse_args()
    ana = json.loads((ROOT / 'analysis/music/汪洋与浩渺_高潮分析.json').read_text(encoding='utf-8'))
    mix, mus = decode(a.mix), decode(a.music)
    # ① 原曲起点：用原曲 5–20 s 在合并文件 0–25 s 里找
    probe = mus[5 * SR:20 * SR]
    c = fftconvolve(mix[:25 * SR], probe[::-1], mode='valid')
    start = int(np.argmax(c)) / SR - 5.0
    n = int(round(start * SR))
    al = np.zeros_like(mix)
    L = min(len(mus), len(mix) - n)
    al[n:n + L] = mus[:L]
    gains, res = [], np.zeros_like(mix)
    W = SR // 2
    for i in range(0, len(mix), W):
        x, y = al[i:i + W], mix[i:i + W]
        g = float(x @ y / (x @ x)) if x @ x > 1e-6 else 0.0
        gains.append(g)
        res[i:i + W] = y - g * x
    # ② VO 段（只看前 25 s）
    band = sosfiltfilt(butter(4, [300, 3500], btype='band', fs=SR, output='sos'), res[:25 * SR])
    fr = SR // 100
    db = 20 * np.log10(np.array([np.sqrt((band[i:i + fr] ** 2).mean()) for i in range(0, len(band) - fr, fr)]) + 1e-9)
    on = db > -32
    segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and (on[j] or on[j + 1:j + 4].any()):
                j += 1
            if j - i >= 8:                                  # ≥ 80 ms 才算一声
                segs.append(dict(start=round(i / 100, 2), end=round(j / 100, 2), peakDb=round(float(db[i:j].max()), 1)))
            i = j
        else:
            i += 1
    words = []
    for sg in segs:                                         # 间隔 < 0.1 s 的段是同一个词（「点火」中间的小停顿）
        if words and sg['start'] - words[-1]['end'] < 0.1:
            words[-1] = dict(start=words[-1]['start'], end=sg['end'], peakDb=max(words[-1]['peakDb'], sg['peakDb']), parts=words[-1].get('parts', 1) + 1)
        else:
            words.append(dict(sg))
    tail = [w for w in words if w['start'] >= a.count_from]
    if len(tail) < 11:
        raise SystemExit(f'{a.count_from} s 以后只找到 {len(tail)} 个词，凑不出 10→1 + 点火；调 --count-from')
    count, fire = tail[-11:-1], tail[-1]
    chat = [w for w in words if w['end'] <= count[0]['start']]
    gaps = [round(y['start'] - x['start'], 2) for x, y in zip(count + [fire], (count + [fire])[1:])]
    bar0 = start + ana['bar0S']
    bar = ana['barS']
    k = int(np.ceil((fire['end'] - bar0) / bar - 1e-6))
    downbeat = round(bar0 + k * bar, 3)                      # 「点火」喊完后的第一个小节重拍（16.0.25 用的 17.19）
    zero = a.zero if a.zero is not None else round(fire['start'], 2)
    gl = [g for g in gains if g > 0.5]
    # ⑤ 工作台时间线显示用（10-13 17:06 B03 默认音频换成合并音频）：波形 1500 段 RMS、能量 0.25 s 一格（dB 映射到 0–1），都按最大值归一
    nb = 1500
    rms = np.array([np.sqrt((mix[int(i * len(mix) / nb):int((i + 1) * len(mix) / nb)] ** 2).mean()) for i in range(nb)])
    wave = [max(0.0001, round(float(v), 4)) for v in rms / rms.max()]
    st = SR // 4
    er = np.array([np.sqrt((mix[i:i + st] ** 2).mean()) for i in range(0, len(mix) - st + 1, st)])
    er = np.convolve(er, np.ones(4) / 4, mode='same')
    energy = [round(float(v), 4) for v in np.clip((20 * np.log10(er / er.max() + 1e-9) + 40) / 40, 0.0045, 1.0)]
    out = dict(format='df.merged-audio-analysis/1', by='跨年秀（22）2026-10-13，用户 16:28 发来的合并音频',
               mix=dict(file=Path(a.mix).name, sha256=sha(a.mix), durationS=round(len(mix) / SR, 3)),
               music=dict(file=str(Path(a.music).relative_to(ROOT)) if Path(a.music).resolve().is_relative_to(ROOT) else Path(a.music).name,
                          sha256=sha(a.music), durationS=round(len(mus) / SR, 3), title='汪洋与浩渺'),
               musicStartS=round(start, 5), musicGain=dict(median=round(float(np.median(gl)), 3), min=round(float(min(gl)), 3), max=round(float(max(gl)), 3)),
               userSaid=dict(voTotalS=16, musicStartS=1, bellS=16, chatS=[0, 6], countdownS=[6, 16]),
               voChat=chat, voCountdown=count, voFire=fire, countdownGapsS=gaps,
               countdownOnsetsS=[s['start'] for s in count], fireS=fire['start'],
               bar0ShowS=round(bar0, 4), barS=bar, zeroShowS=zero, zeroBar=round((zero - bar0) / bar, 3), downbeatAfterFireS=downbeat,
               zeroRule='VO 喊「点火」的起音（用户 10-13 20:38「测试提前一秒」；--zero 可改）' if a.zero is None else '用户指定',
               display=dict(waveform=wave, waveformMethod='1500 段 RMS（单声道混合）÷ 最大值',
                            energy=energy, energyStep=0.25, energyMethod='0.25 s RMS、1 s 平滑，dB −40…0 映射到 0–1'),
               notes=['原曲起点用互相关测，44.1 kHz 精度约 0.02 ms；合并文件是 MP3，解码器延迟已由 ffmpeg 补偿，按播放器听到的为准。',
                      'VO 段是把原曲减掉后剩下的部分，阈值 −32 dB（300–3500 Hz），≥ 80 ms 才算一声；没有逐字转写：10→1 + 点火 是按用户 20:38 听到的对位和 11 个起音的等间隔推的。',
                      '10、9 两声起音软（j / sh 声母），−32 dB 以上从 4.26 / 5.55 s 起，比声母早 0.3–0.4 s 的弱起没算；其余各声取同一阈值，前后一致。',
                      '合并文件里没有单独的钟声；原曲第 10 小节重拍（17.19 s）有明显的整体抬升，比「点火」晚约 1 s。'])
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps({k: out[k] for k in ('musicStartS', 'musicGain', 'countdownOnsetsS', 'countdownGapsS', 'fireS', 'bar0ShowS', 'zeroShowS', 'zeroBar', 'downbeatAfterFireS')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
