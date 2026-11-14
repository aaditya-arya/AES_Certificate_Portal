import {fork} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {once} from 'node:events';
import {join} from 'node:path';

// Content hashes avoid false restarts from synchronized folders and Vite's generated files.
const shared=['src/model.js','src/numbering.js','src/document-model.js','src/dossier-model.js','src/standard-activity.json'];
async function files(folder){const entries=await readdir(folder,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(folder,e.name)):/\.(js|json|sql)$/.test(e.name)?[join(folder,e.name)]:[]))).flat();}
async function fingerprint(){const names=[...shared,...await files('server'),...await files('drizzle')].sort(),hash=createHash('sha256');for(const name of names){hash.update(name);hash.update(await readFile(name));}return hash.digest('hex');}
let previous=await fingerprint(),child,stopping=false,checking=false;
function launch(){child=fork(new URL('./dev.mjs',import.meta.url),process.argv.slice(2),{stdio:['inherit','inherit','inherit','ipc']});child.on('exit',(code,signal)=>{if(!stopping&&!checking){console.error(`Development server exited (${signal||code}). Fix the startup error and run npm run dev again.`);clearInterval(timer);process.exitCode=code||1;}});}
async function stop(){if(!child||child.exitCode!==null||child.signalCode!==null)return;const processToStop=child,done=once(processToStop,'exit');if(processToStop.connected)processToStop.send('shutdown');else processToStop.kill();await done;}
const timer=setInterval(async()=>{if(stopping||checking)return;checking=true;try{const next=await fingerprint();if(next!==previous){previous=next;console.log('Backend code changed; restarting the development server…');await stop();if(!stopping)launch();}}catch(error){console.error(`Could not check backend files: ${error.message}`);}finally{checking=false;}},1000);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;clearInterval(timer);await stop();process.exit(0);});
launch();
