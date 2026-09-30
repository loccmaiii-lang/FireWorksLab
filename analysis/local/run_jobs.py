"""本地跑任务：读 analysis/jobs/ 里还没跑过的任务，用本机显卡渲染、和实拍对照、自动逼近参数，
结果写到 analysis/results/<任务id>/，你再 git push，Claude 读结果继续。

用法（在仓库根目录）：
  python analysis/local/run_jobs.py            跑所有还没结果的任务
  python analysis/local/run_jobs.py --workers=3  3 个进程同时跑（每个进程一个浏览器，任务先认领再跑，不会重复）
  也可以开几个窗口各跑一次 跑任务.bat：同样靠认领，不会重复
  python analysis/local/run_jobs.py QN1 WC1    只跑指定任务
  python analysis/local/run_jobs.py --force QN1  已经跑过的也重跑
  python analysis/local/run_jobs.py --check    只检查环境（打开浏览器、看有没有用上显卡）

任务文件格式（analysis/jobs/<id>.json，由 Claude 写）：
  { "id", "name", "video": 仓库内相对路径, "start": {P, M} 或 起点 json 的相对路径（多层组合：{layers: [{name, P, M, scale, delay}]}，
    拟合参数写 "<层号>.<键>"，如 "0.v0"、"1.M.headInt"）, "ready": false + "hold": "原因"（可选：写好了但先不跑；后台监控也认 ready: false；放行时两个都去掉）,
    "fit": {..., "weights": {"r": 1}}（可选：改差距里各项的权重，比如剪辑过的视频半径不可信）,
    "fit": {"params": [...] 或 null（全部）, "rounds": 3} 或 null（不拟合，只出对照）,
    "variants": {名字: {参数改动}}（可选：额外试几组，各出一张对照图） }
  升空尾缀任务："type": "trail"，格式见 analysis/scripts/trail_job.py
  导出任务："type": "export"，格式见 analysis/scripts/export_job.py
每个任务的结果：
  best.json（最终参数）、对照.jpg（实拍 vs 模拟）、数值.json（逐时刻对照表）、
  variant_<名字>.jpg / .json、log.txt、env.json（显卡、耗时）、done.json（跑完的标记）
"""
import sys, os, json, time, platform, traceback

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'analysis', 'scripts'))
JOBS = os.path.join(ROOT, 'analysis', 'jobs')
RES = os.path.join(ROOT, 'analysis', 'results')
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass

# 哪条线跑的（写进 env.json）：本地双击 bat 为「本地」，WorkBuddy 跑时设 FW_LINE=WorkBuddy。
# 主进程使用 Git 公共目录中的 GPU 锁；所有工作树共用，子进程由父进程持锁。
LINE = os.environ.get('FW_LINE') or '本地'


def jload(p):
    with open(p, encoding='utf-8') as f: return json.load(f)
def jsave(o, p):
    with open(p, 'w', encoding='utf-8') as f: json.dump(o, f, ensure_ascii=False, indent=1)


def run_job(job, s, force=False):
    from compare import video_side, score, sheet, table
    from fit import run_fit
    jid = job['id']; out = os.path.join(RES, jid); os.makedirs(out, exist_ok=True)
    if os.path.exists(os.path.join(out, 'done.json')) and not force:
        print(f'[{jid}] 已经跑过，跳过（要重跑加 --force）'); return True
    # A previous attempt may have left an error that must not accompany a successful retry.
    previous_error = os.path.join(out, 'error.json')
    if os.path.isfile(previous_error): os.remove(previous_error)
    logf = open(os.path.join(out, 'log.txt'), 'w', encoding='utf-8')
    def log(m):
        line = time.strftime('%H:%M:%S ') + str(m); print(f'[{jid}] ' + line, flush=True); logf.write(line + '\n'); logf.flush()
    t0 = time.time()
    try:
        if job.get('type') in ('trail', 'export'):
            if job['type'] == 'trail':
                log(f"开始：{job.get('name', '')}（升空尾缀：校准 → 渐变图 → 导出 → 视频）")
                import trail_job; trail_job.run(job, s, out, log=log)
            else:
                log(f"开始：{job.get('name', '')}（导出素材）")
                import export_job; export_job.run(job, s, out, log=log)
            jsave({'line': LINE, 'renderer': s.renderer, 'mode': s.mode, 'software': s.soft, 'minutes': round((time.time() - t0) / 60, 1), 'machine': platform.platform(), 'finished': time.strftime('%Y-%m-%d %H:%M')},
                  os.path.join(out, 'env.json'))
            jsave({'ok': True}, os.path.join(out, 'done.json'))
            log(f'完成，用时 {(time.time() - t0) / 60:.1f} 分钟'); return True
        log(f"开始：{job.get('name', '')}  视频 {job['video']}")
        st = job['start']
        if isinstance(st, str): st = jload(os.path.join(ROOT, st))
        if st.get('layers'): P, M = {'layers': st['layers']}, {}      # 多层组合（大组合）：参数写 "<层号>.<键>"
        else: P, M = st['P'], st['M']
        V = video_side(os.path.join(ROOT, job['video']), roi=job.get('roi'), t_range=job.get('t_range'), track=bool(job.get('track')))
        log(f"实拍：燃烧 {V['Tb']:.2f}s，最终半径 {V['R']:.0f}px")
        fit = job.get('fit')
        if fit:
            P, M, L, S = run_fit(V, s, P, M, os.path.join(out, 'fit'), fit.get('params'), fit.get('rounds', 3), log=log, camera=fit.get('camera', False), caps=fit.get('caps'), weights=fit.get('weights'))
        for name, d in (job.get('variants') or {}).items():
            dd = dict(d); Mo = dd.pop('M', {}); P2 = dict(P); P2.update(dd); M2 = dict(M); M2.update(Mo)
            S2 = s.side(P2, M2, V['R']); L2, _ = score(V, S2)
            sheet(V, S2, os.path.join(out, f'variant_{name}.jpg')); jsave({'P': P2, 'M': M2, 'loss': L2}, os.path.join(out, f'variant_{name}.json'))
            log(f'变体 {name}：差距 {L2:.4f}')
        # 最终结果用完整画质再出一次
        S = s.side(P, M, V['R']); L, parts = score(V, S, (fit or {}).get('weights'))
        sheet(V, S, os.path.join(out, '对照.jpg'), job.get('name', ''))
        jsave({'P': P, 'M': M, 'loss': L}, os.path.join(out, 'best.json'))
        jsave({'差距': round(float(L), 4), '分项': {k: round(float(v), 4) for k, v in parts.items()}, '实拍燃烧秒': round(V['Tb'], 2), '模拟燃烧秒': round(S['Tb'], 2), '表': table(V, S)},
              os.path.join(out, '数值.json'))
        jsave({'line': LINE, 'renderer': s.renderer, 'mode': s.mode, 'software': s.soft, 'minutes': round((time.time() - t0) / 60, 1), 'machine': platform.platform(), 'finished': time.strftime('%Y-%m-%d %H:%M')},
              os.path.join(out, 'env.json'))
        jsave({'loss': round(float(L), 4)}, os.path.join(out, 'done.json'))
        log(f'完成：差距 {L:.4f}，用时 {(time.time() - t0) / 60:.1f} 分钟')
        # 先写完成标记再删临时文件：删文件被外部拦住 / 超时时，结果仍算完成（fit_best.* 残留也不影响）
        for f in ('fit_best.json', 'fit_best.jpg'):
            try:
                p = os.path.join(out, f)
                if os.path.exists(p): os.remove(p)
            except Exception: pass
        return True
    except Exception:
        log('出错：\n' + traceback.format_exc())
        jsave({'error': traceback.format_exc()}, os.path.join(out, 'error.json'))
        return False
    finally:
        logf.close()


# ---------------- 多开：每个任务「认领」后才跑，几个窗口 / 进程同时跑不会重复 ----------------
# 认领文件 analysis/results/<id>/_claim.json，跑的时候每分钟刷新一次；超过 10 分钟没刷新（进程被关了）就可以被别人接手。
CLAIM_STALE = 600


def _claim_path(jid): return os.path.join(RES, jid, '_claim.json')


def claim(jid):
    os.makedirs(os.path.join(RES, jid), exist_ok=True); p = _claim_path(jid)
    try:
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        try:
            if time.time() - os.path.getmtime(p) < CLAIM_STALE: return False
            os.remove(p); fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except OSError:
            return False
    with os.fdopen(fd, 'w', encoding='utf-8') as f: json.dump({'pid': os.getpid(), 'line': LINE, 'start': time.strftime('%H:%M:%S')}, f)
    return True


def release(jid):
    try: os.remove(_claim_path(jid))
    except OSError: pass


def heartbeat(jid, stop):
    import threading
    def run():
        while not stop.wait(60):
            try: os.utime(_claim_path(jid), None)
            except OSError: pass
    threading.Thread(target=run, daemon=True).start()


def load_jobs(args, force):
    files = sorted(f for f in os.listdir(JOBS) if f.endswith('.json')) if os.path.isdir(JOBS) else []
    jobs = [jload(os.path.join(JOBS, f)) for f in files]
    if args: jobs = [j for j in jobs if j['id'] in args]
    # 先不跑的任务："ready": false（后台监控 watch_jobs.py 也认这个）+ "hold": "原因"。写好了等用户核对原理，放行时两个字段都去掉。
    # 点名跑（run_jobs.py HK1）时不受限——后台监控只会点名它自己选出的（已排除 ready: false 的）任务
    held = lambda j: bool(j.get('hold')) or j.get('ready') is False
    todo = [j for j in jobs if (force or not os.path.exists(os.path.join(RES, j['id'], 'done.json'))) and (not held(j) or j['id'] in args)]
    todo.sort(key=lambda j: -j.get('priority', 0))     # 长的先跑（尾缀），短的穿插
    return jobs, todo


def worker(args, force, tag=''):
    """一个浏览器，一个接一个认领、跑任务，直到没有可认领的"""
    import threading
    from compare import SimSession
    s = None; failures = 0; attempted = set()
    batch_start = float(os.environ.get('FW_BATCH_START', time.time()))
    def tried_this_batch(job):
        if job['id'] in attempted: return True
        # 其他进程失败或强制重跑成功后，本批不再认领同一个任务。
        return any(os.path.isfile(p) and os.path.getmtime(p) >= batch_start
                   for p in (os.path.join(RES, job['id'], name) for name in ('done.json', 'error.json')))
    try:
        while True:
            _, todo = load_jobs(args, force)
            j = next((j for j in todo if not tried_this_batch(j) and claim(j['id'])), None)
            if j is None: break
            attempted.add(j['id'])
            stop = threading.Event(); heartbeat(j['id'], stop)
            try:
                if s is None:
                    s = SimSession()
                    if os.environ.get('FW_REQUIRE_GPU') == '1' and s.soft:
                        raise RuntimeError('后台任务要求真实显卡，检测到软件渲染，已停止')
                    print(f'{tag}执行线：{LINE}  渲染：{s.mode}  浏览器显卡：{s.renderer or "未知"}' + ('  ← 软件渲染，会很慢' if s.soft else ''), flush=True)
                if not run_job(j, s, force): failures += 1
            except Exception:
                jsave({'error': traceback.format_exc()}, os.path.join(RES, j['id'], 'error.json'))
                failures += 1
                break
            finally: stop.set(); release(j['id'])
    finally:
        if s: s.close()
    return int(failures > 0)


def refresh_review():
    """跑完的任务自动进烘焙器的迭代区（tool/data/review.js），刷新烘焙器就能看"""
    try:
        import review_to_baker; review_to_baker.main()
    except Exception as e:
        print('写迭代区失败（不影响结果，Claude 会补上）：' + str(e).splitlines()[0], flush=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force, check = '--force' in sys.argv, '--check' in sys.argv
    nw = next((int(a.split('=')[1]) for a in sys.argv if a.startswith('--workers=')), 1)
    if '--worker' in sys.argv:      # 子进程
        return worker(args, force, f"[进程 {os.getpid()}] ")
    os.environ['FW_BATCH_START'] = str(time.time())
    no_review = '--no-review' in sys.argv
    jobs, todo = load_jobs(args, force)
    if check:
        from compare import SimSession
        s = SimSession()
        try:
            print(f'渲染：{s.mode}  浏览器显卡：{s.renderer or "未知"}')
            if os.environ.get('FW_REQUIRE_GPU') == '1' and s.soft: raise RuntimeError('没有检测到真实显卡')
            t = time.time(); s.pg.evaluate("__fw.renderStills(state.P, state.M, { times: [1.0], px: 512 })")
            print(f'试渲一帧：{time.time() - t:.1f} 秒（有显卡时应在 1–2 秒内）')
        finally: s.close()
        return 0
    if not todo:
        print(f'执行线：{LINE}。任务 {len(jobs)} 个，没有待跑的。', flush=True)
        if not no_review: refresh_review()
        return 0
    nw = max(1, min(nw, len(todo)))
    print(f'任务 {len(jobs)} 个，待跑 {len(todo)} 个（{nw} 个进程同时跑）：' + '、'.join(j['id'] + ' ' + j.get('name', '') for j in todo), flush=True)
    if nw == 1:
        result = worker(args, force)
    else:
        import subprocess
        cmd = [sys.executable, os.path.abspath(__file__), '--worker'] + (['--force'] if force else []) + args
        ps = []
        for i in range(nw):
            ps.append(subprocess.Popen(cmd, cwd=ROOT)); time.sleep(8)     # 错开启动浏览器
        for p in ps: p.wait()
        result = int(any(p.returncode != 0 for p in ps))
    if not no_review: refresh_review()
    print('\n本批结束。' + ('有失败任务，请查看 error.json。' if result else '全部完成。'), flush=True)
    return result


if __name__ == '__main__':
    if '--worker' in sys.argv:
        sys.exit(main())
    from job_lock import ProcessLock, gpu_lock_path
    try:
        with ProcessLock(gpu_lock_path(ROOT)):
            sys.exit(main())
    except BlockingIOError:
        print('另一批显卡任务正在运行，本次跳过。', flush=True)
        sys.exit(75)
