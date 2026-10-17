// 只报当前开发根目录；不读取个人配置、UE或会话令牌。
export function localHealthMiddleware(root) {
  return (req, res, next) => {
    if (new URL(req.url, 'http://127.0.0.1').pathname !== '/__fwl_health') return next();
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '') ||
        (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host)) {
      res.statusCode = 403; res.end('Forbidden'); return;
    }
    if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({format: 'df.workbench-dev/1', root}));
  };
}

export function localHealthPlugin() {
  return {name: 'df-local-health', configureServer(server) {
    server.middlewares.use(localHealthMiddleware(server.config.root));
  }};
}
