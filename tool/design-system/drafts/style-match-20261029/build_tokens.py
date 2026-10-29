"""由本目录唯一规格生成候选令牌，不读写共享设计系统或生产成品。"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
spec = json.loads((here / 'tokens.json').read_text(encoding='utf-8'))
declarations = []
for name, value in spec['color'].items():
    declarations.append((name, value))
for name, value in spec['font'].items():
    declarations.append((name, value))
for group in ('type', 'size'):
    declarations.extend((name, f'{value}px') for name, value in spec[group].items())
declarations.extend((f'space-{name}', f'{value}px') for name, value in spec['space'].items())
for name, value in spec['radius'].items():
    declarations.append(('radius' if name == 'control' else f'{name}-radius', f'{value}px'))
declarations.extend((f'focus-{name}', f'{value}px') for name, value in spec['focus'].items())
declarations.extend((name, f'{value}ms') for name, value in spec['motion'].items())
assert len({name for name, _ in declarations}) == len(declarations), '令牌角色不能重名'
source = '/* 由本目录build_tokens.py生成；只改tokens.json。需显式双重标记启用。 */\n'
source += spec['scope'] + ' {\n'
source += '\n'.join(f'  --br-{name}: {value};' for name, value in declarations)
source += '\n}\n'
(here / 'tokens.css').write_text(source, encoding='utf-8', newline='\n')
print(f'已生成{len(declarations)}个隔离视觉令牌；未改生产或共享文件。')
