"""隔离Chrome资料的仓库恢复/刷新/保存检查；文件夹接口用真实配方内存夹具，绝不写用户配方。"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
fixture = {'__file__': str(ROOT / 'analysis/scripts/界面状态检查.py')}
exec((ROOT / 'analysis/scripts/界面状态检查.py').read_text(encoding='utf-8').split('async def main():')[0], fixture)
docs = [json.loads(p.read_text(encoding='utf-8')) for p in (ROOT / 'analysis/我的配方').glob('my_*/*.json')]
MOCK = r"""docs => {
 window.__repoWrites = [];
 const file = doc => ({kind:'file', name:doc.id+'.json', getFile:async()=>({size:JSON.stringify(doc).length,lastModified:0,text:async()=>JSON.stringify(doc)})});
 const dir = entries => ({kind:'directory', name:'FireWorksLab', queryPermission:async()=> 'granted', getDirectoryHandle:async n => { if (entries[n]) return entries[n]; const e=new Error(n); e.name='NotFoundError'; throw e; }, values:async function*(){for(const [n,v] of Object.entries(entries)) yield {...v,name:n};}});
 const root=dir({analysis:dir({'我的配方':dir(Object.fromEntries(docs.map(d=>['my_'+d.id,dir({[d.id+'.json']:file(d)})])))})});
 repoDir.h=root; repoDir.name=root.name; repoDir.ok=true;
 // 保存的目标是内存，既有文件不受测试影响
 root.getDirectoryHandle=async n=>n==='analysis'?dir({'我的配方':dir(Object.fromEntries(docs.map(d=>['my_'+d.id,dir({[d.id+'.json']:file(d)})])))}):dir({});
 window.__repoFixture=root;
 return repoRead({interactive:true});
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True, args=['--ignore-gpu-blocklist'])
        for profile in range(2):
            ctx, pg, errors = await fixture['fresh'](p, b)
            assert await pg.evaluate('Object.keys(myAll()).length') == 0
            await pg.evaluate(MOCK, docs)
            assert await pg.evaluate('Object.keys(myAll()).length') == len(docs)
            assert await pg.locator('#abRepoRead').count() == 1
            for d in docs:
                got = await pg.evaluate('id=>myAll()[id].snap', d['id'])
                assert got == d['snap']
            await pg.reload(wait_until='load')
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"')
            await pg.evaluate(fixture['FAKE'])
            assert await pg.evaluate('Object.keys(myAll()).length') == len(docs)
            d = docs[0]
            await pg.evaluate('id=>openMyEffect(id)', d['id'])
            await fixture['idle'](pg)
            assert await pg.evaluate('lib.my.name') == d['name']
            assert await pg.evaluate('state.layers.length') == len(d['snap']['layers'])
            await pg.evaluate(MOCK, docs)
            await pg.locator('#abMore > summary').click()
            await pg.locator('#abRepoRead').click()
            await pg.wait_for_function('!repoDir.reading')
            assert await pg.evaluate('Object.keys(myAll()).length') == len(docs)
            # 通过既有保存流程改参数，捕获写入的真实JSON，验证配方格式和数据
            await pg.evaluate("""() => {
              const sink={getDirectoryHandle:async()=>sink,getFileHandle:async()=>({createWritable:async()=>({write:async s=>window.__savedRecipe=JSON.parse(s),close:async()=>{}})})};
              repoDir.h={queryPermission:async()=> 'granted',getDirectoryHandle:async()=>sink};
              state.layers[0].title='恢复后改名';
              return mySave(false);
            }""")
            saved = await pg.evaluate('window.__savedRecipe')
            assert saved['format'] == 'fwl.myrecipe/1' and saved['id'] == d['id']
            assert saved['snap']['layers'][0]['L']['title'] == '恢复后改名'
            assert not errors, errors
            await ctx.close()
            print(f'PASS 独立Chrome资料{profile+1}：四效果读取→刷新保留→打开→修改→保存JSON', flush=True)
        await b.close()

if __name__ == '__main__': asyncio.run(main())
