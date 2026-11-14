import {createServer as createNetServer} from 'node:net';
import {once} from 'node:events';
import {createServer} from 'vite';

// Vite treats port 0 as its default port. Allocate a test port explicitly so
// browser/proxy tests never take the normal development server's port.
export async function createTestVite(options={}) {
  const reservation=createNetServer();
  reservation.listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const port=reservation.address().port;
  await new Promise((resolve,reject)=>reservation.close(error=>error?reject(error):resolve()));
  return createServer({...options,server:{...options.server,host:'127.0.0.1',port,strictPort:true}});
}
