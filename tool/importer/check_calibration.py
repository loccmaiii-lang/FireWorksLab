import copy
import json
from pathlib import Path
import unittest

from calibration import calibrate_trail, position_cm, paired_entries, GRADES

REFERENCE = Path(r'D:\ProjectTextures\FireWorksLab\TR2L_____V5')

class CalibrationChecks(unittest.TestCase):
    def test_three_durations_and_trajectory(self):
        for filename in ['cascade.json','cascade_mobile.json']:
            self.check_trajectory(json.loads((REFERENCE/filename).read_text('utf-8-sig')))

    def check_trajectory(self,source):
        old=copy.deepcopy(source)
        for name,time_s,height in [('Small',3.5,190),('Medium',5,265),('Large',8,410)]:
            spec,report=calibrate_trail(source,name,time_s,height)
            self.assertEqual(source,old)
            self.assertEqual(spec['emitters'][0]['required']['duration_s'],time_s)
            self.assertEqual(spec['emitters'][1]['required']['delay_s'],time_s)
            self.assertTrue(all(e['required']['local_space'] for e in spec['emitters']))
            self.assertEqual(spec['emitters'][0]['required']['pivot_offset'],source['emitters'][0]['required']['pivot_offset'])
            self.assertAlmostEqual(report['fade_start_height_m'],height,places=5)
            for u in [.1,.3,.6,1]:
                reference=position_cm(source['emitters'][0],u*report['reference_rise_s'])
                current=position_cm(spec['emitters'][0],u*time_s)
                self.assertAlmostEqual(current,reference*report['spatial_ratio'],places=3)
            old_dp=next(x for x in source['emitters'][0]['modules'] if x['m']=='DynamicParameter')
            new_dp=next(x for x in spec['emitters'][0]['modules'] if x['m']=='DynamicParameter')
            self.assertEqual(old_dp,new_dp)

    def test_paired_height_and_diameter_endpoints(self):
        for grade,height_range,size_range in [('Small',(180,200),(100,120)),('Medium',(250,280),(180,200)),('Large',(400,420),(280,300))]:
            rise_s=GRADES[grade]['rise_s']
            for height in [height_range[0],sum(height_range)/2,height_range[1]]:
                for diameter in [size_range[0],sum(size_range)/2,size_range[1]]:
                    entries=paired_entries('Trail','Burst',rise_s,height,diameter,250,sum(height_range)/2)
                    self.assertEqual(entries[0]['RandomScaleRatio'],0)
                    self.assertEqual(entries[1]['RandomScaleRatio'],0)
                    self.assertEqual(entries[1]['PositionOffset']['Z'],height*100)
                    self.assertEqual(entries[1]['LocalTimeOffset'],rise_s)
                    self.assertAlmostEqual(entries[0]['EffectScale']['Z']*sum(height_range)/2,height)
                    self.assertAlmostEqual(entries[1]['EffectScale']['X']*250,diameter)

if __name__=='__main__':
    unittest.main(verbosity=2)
