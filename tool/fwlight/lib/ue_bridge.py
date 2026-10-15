# -*- coding: utf-8 -*-
"""
宿主机 -> 运行中的 UE 编辑器 的 Python 远程执行桥。

- 直接加载引擎自带的 remote_execution.py（不随包分发 Epic 源码），运行时打两个补丁：
  1) json.loads(..., encoding=) 在 Python 3.9+ 已移除 -> 去掉 encoding 参数
  2) 原版只 recv(4096) 一次，回包超过 4KB 就报 "Remote party failed to send a valid response!"
     -> 改为循环接收直到 JSON 完整
- UE 侧脚本以 "文件路径 + 参数" 的方式执行（ExecuteFile 模式），脚本内可用 __file__ / sys.argv。
"""
import json
import os
import time
import types

from . import common

_MOD = None


def load_remote_execution(cfg):
    global _MOD
    if _MOD is not None:
        return _MOD
    path = os.path.join(cfg['ue']['engine_root'], 'Plugins', 'Experimental', 'PythonScriptPlugin',
                        'Content', 'Python', 'remote_execution.py')
    if not os.path.exists(path):
        raise SystemExit('找不到引擎的 remote_execution.py: %s\n请检查 config.json 的 ue.engine_root' % path)
    with open(path, encoding='utf-8') as f:
        src = f.read()
    src = src.replace("_json.loads(json_str, encoding='utf-8')", "_json.loads(json_str)")
    mod = types.ModuleType('ue_remote_execution')
    mod.__file__ = path
    exec(compile(src, path, 'exec'), mod.__dict__)

    def _receive_message(self, expected_type):
        sock = self._command_channel_socket
        sock.settimeout(None)
        buf = b''
        while True:
            chunk = sock.recv(1 << 16)
            if not chunk:
                break
            buf += chunk
            try:
                json.loads(buf.decode('utf-8'))
                break
            except ValueError:   # 包括 UnicodeDecodeError / JSONDecodeError：还没收完
                continue
        msg = mod._RemoteExecutionMessage(None, None)
        if buf and msg.from_json_bytes(buf) and msg.passes_receive_filter(self._node_id) and msg.type_ == expected_type:
            return msg
        raise RuntimeError('UE 回包无效（%d 字节）' % len(buf))

    mod._RemoteExecutionCommandConnection._receive_message = _receive_message
    _MOD = mod
    return mod


class UE(object):
    """with UE(cfg) as ue: ue.run_file(path, args)"""

    def __init__(self, cfg, verbose=True):
        self.cfg = cfg
        self.verbose = verbose
        self.rx = None
        self.node = None

    def __enter__(self):
        mod = load_remote_execution(self.cfg)
        u = self.cfg['ue']
        c = mod.RemoteExecutionConfig()
        c.multicast_group_endpoint = (u['remote_multicast_group'], int(u['remote_multicast_port']))
        c.multicast_bind_address = u.get('remote_multicast_bind', '0.0.0.0')
        c.command_endpoint = ('127.0.0.1', int(u.get('remote_command_port', 6776)))
        timeout = float(u.get('remote_discover_timeout_s', 8))
        retries = int(u.get('remote_discover_retries', 4))
        nodes = []
        for attempt in range(retries):
            self.rx = mod.RemoteExecution(c)
            self.rx.start()
            t0 = time.time()
            while time.time() - t0 < timeout and not self.rx.remote_nodes:
                time.sleep(0.2)
            nodes = list(self.rx.remote_nodes)
            if nodes:
                break
            self.rx.stop()
            self.rx = None
            if attempt + 1 < retries:
                print('[UE] 暂未响应（编辑器可能正忙：加载/编译/弹窗），%d 秒后重试 %d/%d ...' % (3, attempt + 2, retries))
                time.sleep(3)
        if not nodes:
            raise SystemExit(
                '没有发现运行中的 UE 编辑器。\n'
                '  1) 确认编辑器已打开本项目；\n'
                '  2) 确认 DefaultEngine.ini [/Script/PythonScriptPlugin.PythonScriptPluginSettings] bRemoteExecution=True，'
                '组播地址 = %s:%s；\n  3) 首次运行若弹出 Windows 防火墙提示，请允许；\n'
                '  4) 编辑器若有模态弹窗 / 正在加载关卡或编译 Shader，等它空闲后重试。'
                % (u['remote_multicast_group'], u['remote_multicast_port']))
        want = os.path.normcase(os.path.normpath(u['project_root']))
        pick = None
        for n in nodes:
            pr = os.path.normcase(os.path.normpath(n.get('project_root', '')))
            if pr == want:
                pick = n
                break
        if pick is None:
            pick = nodes[0]
            print('[警告] 没有找到 project_root 完全匹配的编辑器，使用: %s' % pick.get('project_root'))
        self.node = pick
        if self.verbose:
            print('[UE] 已连接 %s | %s | %s' % (pick.get('engine_version'), pick.get('project_name'), pick.get('project_root')))
        self.rx.open_command_connection(pick['node_id'])
        return self

    def __exit__(self, *a):
        if self.rx:
            self.rx.stop()

    def run_file(self, script, args=()):
        script = os.path.abspath(script).replace('\\', '/')
        parts = ['"%s"' % script] + ['"%s"' % str(a).replace('\\', '/') for a in args]
        cmd = ' '.join(parts)
        res = self.rx.run_command(cmd, unattended=True, exec_mode='ExecuteFile')
        outs = [o.get('output', '') for o in res.get('output', [])]
        if self.verbose:
            for o in outs:
                print('   [UE] ' + o)
        if not res.get('success'):
            raise SystemExit('UE 脚本执行失败:\n%s' % res.get('result'))
        return res


def run_job(cfg, script_name, job, verbose=True, after_connect=None):
    """把参数写成 job json -> UE 执行 ue/<script_name> <job.json> -> 读回 job['out']。
    after_connect: 连上编辑器之后、发送脚本之前调用（apply 用它做备份，连不上就不产生无用备份）。"""
    common.ensure_dirs()
    ts = time.strftime('%Y%m%d_%H%M%S')
    job_path = os.path.join(common.OUT_DIR, 'job_%s_%s.json' % (os.path.splitext(script_name)[0], ts))
    if not common.is_ascii(job_path):
        raise SystemExit('交接包所在路径含非 ASCII 字符，UE 内的 Python 2.7 可能无法读取。请放到纯英文路径下: %s' % common.ROOT)
    if os.path.exists(job['out']):
        os.remove(job['out'])
    common.write_json(job_path, job, indent=1)
    try:
        with UE(cfg, verbose=verbose) as ue:
            if after_connect:
                after_connect()
            ue.run_file(os.path.join(common.UE_DIR, script_name), [job_path])
        if not os.path.exists(job['out']):
            raise SystemExit('UE 脚本未产出结果文件: %s' % job['out'])
        return common.read_json(job['out'])
    finally:
        try:
            os.remove(job_path)
        except OSError:
            pass
