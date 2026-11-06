# 用法：python tool/build.py 之后，python tool/prototypes/5.0.1预览/make.py
# 把 preview.css / preview.js 叠到 tool/烟花工坊.html 上，生成 tool/prototypes/5.0.1预览/烟花工坊_5.0.1预览.html（不进 Git）
import os
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', '烟花工坊.html')
html = open(src, encoding='utf-8').read()
css = open(os.path.join(here, 'preview.css'), encoding='utf-8').read()
js = open(os.path.join(here, 'preview.js'), encoding='utf-8').read()
i = html.rfind('</head>'); assert i > 0
html = html[:i] + '<style id="p501">\n' + css + '\n</style>\n' + html[i:]
j = html.rfind('</body>'); assert j > 0
html = html[:j] + '<script id="p501js">\n' + js + '\n</script>\n' + html[j:]
out = os.path.join(here, '烟花工坊_5.0.1预览.html')
open(out, 'w', encoding='utf-8').write(html)
print('built', out, len(html.encode('utf-8')), 'bytes')
