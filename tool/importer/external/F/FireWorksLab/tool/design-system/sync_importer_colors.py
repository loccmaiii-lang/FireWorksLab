"""把共享颜色嵌入既有导入器HTML，只更新CSS；不重建导入器或改动版本/脚本。

用法：python tool/design-system/sync_importer_colors.py --html <本机原导入器HTML> [--check]
私有构建器也可直接调用 apply_theme(html)，沿用同一份颜色来源。
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
START = '/* DF shared importer colors start */'
END = '/* DF shared importer colors end */'
BLOCK = re.compile(re.escape(START) + r'[\s\S]*?' + re.escape(END) + r'\n')


def theme_css():
    tokens = json.loads((HERE / 'tokens.json').read_text(encoding='utf-8'))
    colors = []
    for key, value in tokens['color'].items():
        if not re.fullmatch(r'[a-z0-9-]+', key) or not re.fullmatch(r'#[a-fA-F0-9]{6}', value):
            raise ValueError('共享颜色定义无效：' + key)
        colors.append('  --fw-color-' + key + ':' + value + ';')
    return ('/* DF colors ' + tokens['version'] + '; generated from tokens.json */\n'
            + ':root{\n' + '\n'.join(colors) + '\n}\n'
            + (HERE / 'importer-colors.css').read_text(encoding='utf-8'))


def without_theme(html):
    if html.count(START) != html.count(END) or html.count(START) > 1:
        raise ValueError('共享颜色标记不完整，不修改原文件')
    return BLOCK.sub('', html)


def apply_theme(html):
    original = without_theme(html)
    if '</style>' not in original or '</head>' not in original:
        raise ValueError('目标不是带内联样式的导入器HTML')
    block = START + '\n' + theme_css() + '\n' + END + '\n'
    updated = original.replace('</style>', block + '</style>', 1)
    if without_theme(updated) != original:
        raise ValueError('颜色块以外的内容发生变化，不修改原文件')
    return updated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    before = args.html.read_bytes()
    updated = apply_theme(before.decode('utf-8')).encode('utf-8')
    if args.check:
        if before != updated:
            raise SystemExit('导入器颜色未同步，请先运行不带 --check 的同一命令')
    elif before != updated:
        temp = args.html.with_suffix('.theme.tmp')
        if temp.exists():
            raise SystemExit('临时文件已存在，不覆盖：' + str(temp))
        try:
            temp.write_bytes(updated)
            temp.replace(args.html)
        finally:
            temp.unlink(missing_ok=True)
    print('共享颜色已核对；颜色块以外原样保留。SHA256 ' + hashlib.sha256(updated).hexdigest())


if __name__ == '__main__':
    main()
