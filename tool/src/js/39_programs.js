// 显卡程序按首次使用初始化；启动时不用的导出 / 尾缀程序不阻塞首屏。
// 创建成功后换成普通属性，逐帧渲染不再经过 getter；失败保留重试入口。
function lazyProgram(create) {
  const out = {};
  const init = () => {
    const ready = create();
    Object.defineProperties(out, {
      p: { value: ready.p, writable: true, enumerable: true, configurable: true },
      u: { value: ready.u, writable: true, enumerable: true, configurable: true }
    });
    return ready;
  };
  Object.defineProperties(out, {
    p: { get: () => init().p, enumerable: true, configurable: true },
    u: { get: () => init().u, enumerable: true, configurable: true }
  });
  return out;
}
