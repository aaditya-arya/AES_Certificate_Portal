import {fail} from './validation.js';
const statement=(sql,params=[])=>({sql,params});

// Reservations survive deletion and failed saves, so an issued reference is never reused.
export async function allocateNumber(db,owner,base,kind){
 if(!base)fail(422,'NUMBERING_INCOMPLETE','Complete the inspection details before generating a reference.');
 const previous=await db.get('SELECT * FROM number_allocations WHERE owner=?',[owner]);if(previous)return previous;
 const table=kind==='report'?'reports':'inspection_documents',column=kind==='report'?'report_no':'number';
 await db.batch([
  statement('INSERT INTO number_counters(scope,value) VALUES(?,0) ON CONFLICT(scope) DO NOTHING',[base]),
  statement(`UPDATE number_counters SET value=max(value,coalesce((SELECT max(cast(substr(${column},length(?)+1) AS INTEGER)) FROM ${table} WHERE substr(${column},1,length(?))=?),0))+1 WHERE scope=? AND NOT EXISTS(SELECT 1 FROM number_allocations WHERE owner=?)`,[base,base,base,base,owner]),
  statement("INSERT INTO number_allocations(owner,scope,sequence,reference) SELECT ?,scope,value,scope||printf('%02d',value) FROM number_counters WHERE scope=? AND NOT EXISTS(SELECT 1 FROM number_allocations WHERE owner=?) ON CONFLICT(owner) DO NOTHING",[owner,base,owner])
 ]);
 const result=await db.get('SELECT * FROM number_allocations WHERE owner=?',[owner]);if(!result)fail(503,'NUMBERING_UNAVAILABLE','The reference could not be reserved. Retry saving.');return result;
}
