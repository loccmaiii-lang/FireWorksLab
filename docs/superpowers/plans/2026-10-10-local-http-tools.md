# 三工具本机HTTP入口实施计划

目标：保留离线HTML，在同一台电脑用固定HTTP地址对三个现有工具做真实浏览器检查。只新增启动/只读服务，不重写业务和UE接口。

1. [ ] 核对服务与文件。8034/baker已有本机交付服务；8025已有Vite。原特效工作台HTML完全内联。新增8036 /workbench/仅提供配置指定的原文件，不暴露目录/任意文件。
2. [ ] 新增tool/local_http/service.py、launcher.py、index.html、start.cmd、README.md与tool/启动全部工具.cmd。读取本机~/.fireworkslab/local-http-tools.json，路径/Node均留本机；复用8034（ensure_service，不prepare/rebuild）与8025（精确Vite标记），服务限127.0.0.1，8036 Host白名单，GET/HEAD，无UE代理/POST/任意路径。端口已有错误服务时失败，不杀进程。默认固定路径；不新建交付版本目录，不改原HTML/ZIP。
3. [ ] test_service.py/test_launcher.py：原文件逐字节/即时覆盖/缺文件/目录遍历/Host/POST拒绝、正确服务复用/冲突、8025精确标识与launcher失败处理。实际重复启动PID一致、三个工具首屏/控件可见/只读UE连接。现有浏览器file限制不改，实际文件导入自动操作仍单独受权限限制。
4. [ ] 编排源8025保持；离线HTML保持v16。file、8034、8036、8025各自浏览器数据不迁移或清空；README说明节目dfshow/旧工作台备份导出导入。更新对话24、状态、交接§5、仓库梳理与看法，安全同步推送。用户验收与真实UE写入不由HTTP自检推定。

验证命令：python -X utf8 -m unittest discover -s tool/local_http -p "test_*.py" -v；python -X utf8 tool/local_http/launcher.py --no-browser；再实际HTTP浏览器走查。
