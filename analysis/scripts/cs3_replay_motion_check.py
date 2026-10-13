"""独立头部的导出回放：按 Absolute 速度曲线积分，不能固定在发射点。"""
import importlib.util
from pathlib import Path
p=Path(__file__).with_name('回放检查.py');s=importlib.util.spec_from_file_location('replay',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a=m.Pack.__new__(m.Pack);a.e={'required':{'screen_alignment':'Velocity','pivot_offset':[-0.5,-0.5]}};a.life=2
a.mods={'InitialLocation':{'StartLocation':{'const':[0,0,0]}},'InitialSize':{'StartSize':{'const':[100,100,1]}},'VelocityOverLife':{'Absolute':True,'VelOverLife':{'curve':[[0,[0,0,200]],[1,[0,0,100]]]}}}
assert abs(a.offset(.5)[1]-175)<1e-6,a.offset(.5)
print('PASS Absolute 速度积分与移动星头')
