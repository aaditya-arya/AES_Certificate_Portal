import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function openDatabase(filename=process.env.DATABASE_PATH||'data/aes-portal.sqlite'){
 if(filename!==':memory:')mkdirSync(dirname(resolve(filename)),{recursive:true});
 const connection=new DatabaseSync(filename);connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS node_migrations(name TEXT PRIMARY KEY);');
 const folder=fileURLToPath(new URL('../drizzle/',import.meta.url));
 for(const name of readdirSync(folder).filter(name=>name.endsWith('.sql')).sort())if(!connection.prepare('SELECT name FROM node_migrations WHERE name=?').get(name)){
  connection.exec('BEGIN IMMEDIATE');try{connection.exec(readFileSync(resolve(folder,name),'utf8'));connection.prepare('INSERT INTO node_migrations(name) VALUES(?)').run(name);connection.exec('COMMIT');}catch(error){connection.exec('ROLLBACK');throw error;}
 }
 const run=(sql,params=[])=>connection.prepare(sql).run(...params);
 return {kind:'sqlite',filename:filename===':memory:'?filename:resolve(filename),get:async(sql,params=[])=>connection.prepare(sql).get(...params),all:async(sql,params=[])=>connection.prepare(sql).all(...params),
 batch:async(statements)=>{connection.exec('BEGIN IMMEDIATE');try{const result=statements.map(({sql,params})=>run(sql,params));connection.exec('COMMIT');return result;}catch(error){connection.exec('ROLLBACK');throw error;}},close:()=>connection.close()};
}
