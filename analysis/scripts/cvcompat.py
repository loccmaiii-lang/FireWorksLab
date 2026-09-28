"""Windows 上 OpenCV 不认中文路径：读视频先复制到临时英文路径，写图片 / 视频先写临时文件再移过去。
import 一次即可（给 cv2 打补丁）；Linux / macOS 上什么都不做。"""
import os, sys, shutil, tempfile, itertools
import cv2

_n = itertools.count()


def _ascii(p):
    try: str(p).encode('ascii'); return True
    except UnicodeEncodeError: return False


def _tmp(ext):
    return os.path.join(tempfile.gettempdir(), f'fw_cv_{os.getpid()}_{next(_n)}{ext}')


if os.name == 'nt' and not getattr(cv2, '_fw_patched', False):
    _VC, _VW, _imw, _imr = cv2.VideoCapture, cv2.VideoWriter, cv2.imwrite, cv2.imread

    def VideoCapture(path, *a):
        if isinstance(path, str) and not _ascii(path) and os.path.exists(path):
            t = _tmp(os.path.splitext(path)[1]); shutil.copyfile(path, t); path = t
        return _VC(path, *a)

    class VideoWriter:
        def __init__(self, path, *a):
            self._dst = path; self._tmp = _tmp(os.path.splitext(path)[1]) if not _ascii(path) else None
            self._w = _VW(self._tmp or path, *a)
        def write(self, f): self._w.write(f)
        def isOpened(self): return self._w.isOpened()
        def release(self):
            self._w.release()
            if self._tmp: shutil.move(self._tmp, self._dst)

    def imwrite(path, img, *a):
        if _ascii(path): return _imw(path, img, *a)
        ok, buf = cv2.imencode(os.path.splitext(path)[1] or '.png', img, *a)
        if ok: open(path, 'wb').write(buf.tobytes())
        return ok

    def imread(path, *a):
        if _ascii(path): return _imr(path, *a)
        import numpy as np
        return cv2.imdecode(np.fromfile(path, np.uint8), *(a or (cv2.IMREAD_COLOR,)))

    cv2.VideoCapture, cv2.VideoWriter, cv2.imwrite, cv2.imread = VideoCapture, VideoWriter, imwrite, imread
    cv2._fw_patched = True
