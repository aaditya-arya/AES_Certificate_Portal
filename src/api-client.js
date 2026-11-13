import {get} from 'idb-keyval';
import {newReport,hydrateReport} from './model.js';
export class RequestError extends Error{constructor(message,status,code){super(message);this.status=status;this.code=code;}}
const versions=new Map();let writes=Promise.resolve();
async function request(path,{method='GET',body,headers={}}={}){
 let response;try{response=await fetch(`/api/v1${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});}catch{throw new RequestError('The server is unreachable. Keep this report open and retry saving.',0,'NETWORK_ERROR');}
 if(response.status===204)return null;
 const value=await response.json().catch(()=>null);if(!response.ok)throw new RequestError(value?.error?.message||'The server request failed.',response.status,value?.error?.code);
 return value;
}
export async function listReports(filters={}){const search=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==''&&value!=null));return request(`/reports?${search}`);}
export async function dashboard(){return (await request('/dashboard')).data;}
export async function readReport(id){await writes.catch(()=>{});const {data}=await request(`/reports/${encodeURIComponent(id)}`);versions.set(id,data.version);return hydrateReport(data.report);}
export function saveReport(report){
 const snapshot=structuredClone(report);
 const task=writes.catch(()=>{}).then(async()=>{
  const version=versions.get(snapshot.id),result=await request(version?`/reports/${snapshot.id}`:'/reports',{method:version?'PUT':'POST',body:snapshot,headers:version?{'If-Match':`"${version}"`}:{}});versions.set(snapshot.id,result.data.version);return result.data;
 });writes=task;return task;
}
export async function deleteReport(id,version){await writes.catch(()=>{});await request(`/reports/${id}`,{method:'DELETE',headers:{'If-Match':`"${versions.get(id)||version}"`}});versions.delete(id);}
export async function migrateBrowserReports(){
 if(localStorage.getItem('aes-sql-migration-v1')==='done')return 0;
 let legacy;try{legacy=(await get('aes-reports-v1'))||[];}catch{legacy=[];}
 let imported=0;
 for(const raw of legacy){const report=hydrateReport(raw),base=newReport(),clean=Object.fromEntries(Object.keys(base).map(key=>[key,report[key]??base[key]]));
  try{await request(`/reports/${clean.id}`);}catch(error){if(error.status!==404)throw error;await saveReport(clean);imported++;}
 }
 localStorage.setItem('aes-sql-migration-v1','done');return imported;
}
export async function exportJson(id){return request(`/reports/${id}/export`);}
