import {createServer} from 'vite';
import {once} from 'node:events';
import {startServer} from '../server/index.js';
const running=startServer({port:Number(process.env.API_PORT)||3001});await once(running.server,'listening');
const args=process.argv.slice(2),portIndex=args.indexOf('--port'),port=portIndex>=0?Number(args[portIndex+1]):5173;
const vite=await createServer({server:{host:'127.0.0.1',port,strictPort:true}});await vite.listen();vite.printUrls();
let closing=false;async function close(){if(closing)return;closing=true;await vite.close();await running.close();process.exit(0);}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,close);
process.on('message',message=>{if(message==='shutdown')void close();});
