# 包围盒修订算法的离线回归，不读取运行中的测量结果、不连UE。
import unittest,math,itertools
from final_plan import local_box,margin
from cascade_model import rot_matrix,local_to_world
class BoundsTests(unittest.TestCase):
    def test_identity_and_scale(self):
        self.assertEqual(local_box([-20,-40,-60],[60,80,100],2,0,0),[[-10,30],[-20,40],[-30,50]])
    def test_margin_is_centered_and_outward_rounded(self):
        box=[[-1,2],[100,200],[-5,5]]
        result=margin(box)
        for (lo,hi),(a,b) in zip(box,result):
            c=(lo+hi)/2;h=(hi-lo)/2*1.1
            self.assertLessEqual(a,c-h);self.assertGreaterEqual(b,c+h)
            self.assertEqual(a%10,0);self.assertEqual(b%10,0)
    def test_rotated_aabb_inverse_conservative(self):
        source=[[-10,20],[-30,40],[-50,60]]
        for p,r,s in itertools.product((-50,0,50),(-50,0,50),(.65,.8,1.6)):
            m=rot_matrix(p,0,r)
            corners=[local_to_world(m,tuple(a*s for a in v)) for v in itertools.product(*source)]
            mn=[min(v[i] for v in corners) for i in range(3)];mx=[max(v[i] for v in corners) for i in range(3)]
            back=local_box(mn,mx,s,p,r)
            for i in range(3):
                self.assertLessEqual(back[i][0],source[i][0]+1e-8)
                self.assertGreaterEqual(back[i][1],source[i][1]-1e-8)
    def test_not_unified_fixed_value(self):
        self.assertNotEqual(margin([[-10,10]]*3),margin([[-50,70],[-5,5],[-100,300]]))
if __name__=='__main__':unittest.main()
