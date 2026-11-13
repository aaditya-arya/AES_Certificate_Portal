import {build as viteBuild} from 'vite';
import {build as bundle} from 'esbuild';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
await viteBuild();
const root=resolve('dist/client'),assets={};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.json':'application/json','.ttf':'font/ttf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const path=resolve(folder,entry.name);if(entry.isDirectory())await walk(path);else assets[`/${relative(root,path).replaceAll('\\','/')}`]=[mime[extname(path)]||'application/octet-stream',gzipSync(await readFile(path)).toString('base64')];}}
await walk(root);await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const generated=`export default ${JSON.stringify(assets)};`;
await bundle({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'embedded-assets',setup(build){build.onResolve({filter:/generated-assets\.js$/},()=>({path:'embedded-assets',namespace:'aes-assets'}));build.onLoad({filter:/.*/,namespace:'aes-assets'},()=>({contents:generated,loader:'js'}));}}]});
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log(`Node frontend and hosted API built. ${Object.keys(assets).length} assets embedded in the hosted Worker.`);
