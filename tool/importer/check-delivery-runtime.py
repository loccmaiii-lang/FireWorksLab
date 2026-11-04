"""隔离验证私有构建会同步烘焙器实际使用的既有文件副本，不创建目录。"""
import importlib.util,json,unittest
from pathlib import Path
from unittest.mock import patch,Mock

spec=importlib.util.spec_from_file_location('private_delivery_build',Path(__file__).with_name('build-delivery.py'))
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)

class RuntimeSync(unittest.TestCase):
    def run_case(self,case='ok'):
        root=Path('F:/Fixture/tool');shared=root/'design-system';output=Path('D:/Fixture/importer.html');setup=Path('D:/Fixture/settings.json');runtime=root/'local_delivery/runtime/importer.html'
        marker="  async function deliveryGate(){command.push('--register','--proofs-stdin');}\n  readPack=async()=>{};\nfunction deliveryRegistrationOnly(){}"
        files={str(output):marker,str(setup):json.dumps({'importerPath':str(output if case!='wrong_source' else Path('D:/Other/importer.html'))}),str(runtime):'old --proofs'}
        callback=Mock()
        def prepare(tool,importer,settings):
            callback(tool,importer,settings)
            if case!='stale_result':files[str(runtime)]=files[str(output)]+'\n// directory client + host'
            return True
        with patch.object(Path,'read_text',lambda p,**kwargs:files[str(p)]),patch.object(Path,'is_file',lambda p:str(p) in files),patch.object(Path,'is_dir',lambda p:case!='missing_directory'),patch.object(Path,'mkdir') as mkdir,patch.object(build,'runtime_preparer',return_value=prepare):
            if case=='ok':
                result=build.sync_file_runtime(shared,output,setup)
                self.assertEqual(result,runtime);callback.assert_called_once_with(root,output,setup);mkdir.assert_not_called()
            else:
                with self.assertRaises(ValueError):build.sync_file_runtime(shared,output,setup)
                if case in ('wrong_source','missing_directory'):callback.assert_not_called()
                mkdir.assert_not_called()
    def test_existing_copy_updated_through_canonical_prepare(self):self.run_case()
    def test_other_configured_importer_not_overwritten(self):self.run_case('wrong_source')
    def test_no_directory_creation(self):self.run_case('missing_directory')
    def test_stale_output_cannot_claim_sync_success(self):self.run_case('stale_result')

if __name__=='__main__':unittest.main(verbosity=2)
