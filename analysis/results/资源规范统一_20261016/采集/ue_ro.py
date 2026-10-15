# 只读 GPUECli 客户端（资源规范统一 · 第 1 步干跑用）。
# 路由白名单：只读的 /object/get、/object/search、/datatable/search、/datatable/rows，
# /object/call 只放行 EditorAssetLibrary 的只读函数 LoadAsset / DoesAssetExist。
# 没有任何写入、保存、导入、P4、开关 UE 的路由。顺序请求，每次记录耗时和结果。
#
# 10-16 04:2x 查到的 10053 原因：urllib 把请求头和请求体分两次 send，服务端只读了第一段就回错并关连接，
# 客户端发请求体时被中止（WinError 10053 出在 sendall 上）。改成原始 socket 一次 sendall 整个请求 + TCP_NODELAY。
import json, socket, time

HOST, PORT, PREFIX = '127.0.0.1', 17780, '/gpcli'
ALLOW = {'/object/get', '/object/search', '/datatable/search', '/datatable/rows', '/object/call'}
CALL_ALLOW = {'LoadAsset', 'DoesAssetExist'}
LOG = []


class UEError(Exception):
    pass


def _http(route, body, timeout):
    head = ('POST %s%s HTTP/1.1\r\nHost: %s:%d\r\nContent-Type: text/plain\r\nContent-Length: %d\r\n'
            'Connection: close\r\n\r\n' % (PREFIX, route, HOST, PORT, len(body))).encode('ascii')
    s = socket.create_connection((HOST, PORT), timeout=timeout)
    try:
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        s.sendall(head + body)
        chunks = []
        while True:
            c = s.recv(1 << 16)
            if not c:
                break
            chunks.append(c)
            data = b''.join(chunks)
            i = data.find(b'\r\n\r\n')
            if i >= 0:
                hdr = data[:i].decode('latin-1').lower()
                for line in hdr.split('\r\n'):
                    if line.startswith('content-length:'):
                        n = int(line.split(':', 1)[1])
                        if len(data) - i - 4 >= n:
                            chunks = [data]
                            raise StopIteration
    except StopIteration:
        pass
    finally:
        s.close()
    data = b''.join(chunks)
    i = data.find(b'\r\n\r\n')
    if i < 0:
        raise UEError('响应不完整（%d 字节）' % len(data))
    first = data[:i].split(b'\r\n', 1)[0]
    status = int(first.split(b' ')[1])
    return status, data[i + 4:].decode('utf-8')


def request(route, payload, timeout=60, retry_abort=1):
    if route not in ALLOW:
        raise UEError('只读白名单外的路由：' + route)
    if route == '/object/call' and payload.get('function') not in CALL_ALLOW:
        raise UEError('只读白名单外的函数：' + str(payload.get('function')))
    if route == '/object/search' and str(payload.get('class', '')).lower() == 'world':
        raise UEError('不做 World 枚举')
    body = json.dumps(payload).encode('utf-8')
    attempt = 0
    while True:
        t0 = time.time()
        try:
            status, text = _http(route, body, timeout)
        except (OSError, UEError) as e:
            ms = int((time.time() - t0) * 1000)
            LOG.append({'route': route, 'payload': payload, 'ms': ms, 'ok': False, 'error': str(e)})
            if attempt < retry_abort:
                attempt += 1
                time.sleep(1.0)
                continue
            raise UEError(str(e))
        ms = int((time.time() - t0) * 1000)
        try:
            value = json.loads(text)
        except ValueError:
            LOG.append({'route': route, 'payload': payload, 'ms': ms, 'ok': False, 'error': 'JSON 解析失败', 'status': status})
            raise UEError('JSON 解析失败：' + text[:200])
        ok = status == 200 and value.get('success') is not False
        LOG.append({'route': route, 'payload': payload, 'ms': ms, 'ok': ok, 'bytes': len(text), 'status': status})
        if not ok:
            raise UEError(value.get('message') or text[:300])
        return value.get('data', value)
