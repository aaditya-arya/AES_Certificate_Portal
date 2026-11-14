import {ApiError,fail,validId} from './validation.js';
import {newDocument,newDocumentItem,documentTypes,documentIssues,issueTypes,itemFields,attachmentPurposes} from '../src/document-model.js';
import {today} from '../src/model.js';
import {parseDateToIso,location} from '../src/model.js';
import {fromBase64,toBase64,toHex,ascii} from './binary.js';
import {allocateNumber} from './numbering.js';
import {documentNumberBase} from '../src/numbering.js';
const sql=(sql,params=[])=>({sql,params});
const text=(value,label,max=100000)=>{if(typeof value!=='string'||value.length>max)fail(422,'INVALID_FIELD',`${label} must be text of at most ${max} characters.`);return value;};
const date=value=>parseDateToIso(value)||value;
const like=value=>`%${value.replace(/[\\%_]/g,'\\$&')}%`;
const contextOf=row=>{const r=JSON.parse(row.document);return {reportId:r.id,reportNo:r.reportNo,client:r.client,project:r.project,vendor:r.manufacturer,purchaseOrder:r.vendorPO,inspectionDate:r.inspectionDate,inspectionStage:r.stages.join(', '),location:location(r,true),inspector:r.inspector};};

export function documentsRepository(db,bucket=null){
 const row=id=>db.get('SELECT * FROM inspection_documents WHERE id=?',[id]);
 const publicRecord=value=>({numberingMode:'manual',...JSON.parse(value.document),context:JSON.parse(value.context),version:value.version,createdAt:value.created_at,updatedAt:value.updated_at});
 async function detail(id,version){
  const current=await row(id);if(!current)fail(404,'NOT_FOUND','Document not found.');
  if(version){const historic=await db.get('SELECT * FROM document_versions WHERE document_id=? AND version=?',[id,version]);if(!historic)fail(404,'NOT_FOUND','Document version not found.');return {...JSON.parse(historic.document),context:JSON.parse(historic.context),version:historic.version,recordedAt:historic.recorded_at,historical:true};}
  return publicRecord(current);
 }
 async function file(id,fileId,version){
  const record=await detail(id,version);if(!record.attachments.some(item=>item.id===fileId))fail(404,'NOT_FOUND','This file is not attached to the selected version.');
  const stored=await db.get('SELECT * FROM document_files WHERE id=? AND document_id=?',[fileId,id]);if(!stored)fail(404,'NOT_FOUND','Attachment not found.');
  if(stored.storage_key){const object=await bucket.get(stored.storage_key);if(!object)fail(503,'FILE_UNAVAILABLE','The stored file is temporarily unavailable.');stored.bytes=new Uint8Array(await object.arrayBuffer());}
  return stored;
 }
 async function normalize(input,previous){
  if(!input||typeof input!=='object'||Array.isArray(input)||!documentTypes[input.type])fail(422,'INVALID_DOCUMENT','Select a supported document type.');
  const record=newDocument(input.type),allowed=new Set(Object.keys(record));
  for(const key of Object.keys(input))if(!allowed.has(key))fail(422,'UNKNOWN_FIELD',`Unknown document field: ${key}`);
  if(previous&&(input.type!==previous.type||input.reportId!==previous.report_id))fail(422,'IMMUTABLE_LINK','The document type and linked inspection cannot change. Create a separate document instead.');
  record.id=input.id||record.id;if(!validId(record.id))fail(422,'INVALID_ID','Invalid document ID.');
  if(previous&&record.id!==previous.id)fail(422,'INVALID_ID','Document ID does not match.');
  record.reportId=input.reportId;if(!validId(record.reportId))fail(422,'INVALID_LINK','Select a saved inspection report.');
  for(const key of Object.keys(record))if(!['id','type','reportId','items','attachments','status','revision'].includes(key)&&input[key]!==undefined)record[key]=text(input[key],key);
  if(input.status!==undefined&&input.status!==(previous?.status||'draft'))fail(422,'INVALID_STATUS','Use a document transition to change its status.');
  record.status=previous?.status||'draft';record.revision=previous?.revision||'00';
  for(const key of ['date','targetDate','closedDate'])record[key]=date(record[key]);
  record.numberingMode=input.numberingMode||(previous?JSON.parse(previous.document).numberingMode||'manual':'automatic');if(!['automatic','manual'].includes(record.numberingMode))fail(422,'INVALID_NUMBERING','Choose automatic or manual document numbering.');
  if(record.result&&!['Accepted','Accepted with comments','Rejected'].includes(record.result))fail(422,'INVALID_RESULT','Select a valid inspection result.');
  for(const [key,,kind,values]of documentTypes[record.type].fields)if(kind==='select'&&record[key]&&!values.includes(record[key]))fail(422,'INVALID_FIELD',`Select a valid ${key}.`);
  if(!Array.isArray(input.items)||input.items.length>500)fail(422,'INVALID_ITEMS','Use at most 500 item rows.');
  record.items=input.items.map(item=>{if(!item||typeof item!=='object')fail(422,'INVALID_ITEM','Invalid item.');const clean={id:item.id||crypto.randomUUID()};if(!validId(clean.id))fail(422,'INVALID_ID','Invalid item ID.');for(const [key]of itemFields)clean[key]=text(item[key]??'',key);clean.dueDate=date(clean.dueDate);if(!['open','closed'].includes(clean.status)||!['Low','Normal','High','Critical'].includes(clean.priority))fail(422,'INVALID_ITEM','Select a valid item status and priority.');return clean;});
  if(new Set(record.items.map(item=>item.id)).size!==record.items.length)fail(422,'INVALID_ITEMS','Item IDs must be unique.');
  if(!Array.isArray(input.attachments)||input.attachments.length>10)fail(422,'INVALID_ATTACHMENTS','Attach at most ten files.');
  const files=[];let total=0;record.attachments=[];
  for(const item of input.attachments){
   if(!item||!validId(item.id))fail(422,'INVALID_ATTACHMENT','Each attachment needs a valid ID.');
   let metadata;
   if(item.data){
    const match=/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(item.data);if(!match)fail(422,'INVALID_ATTACHMENT','Use a base64 data URL for a new attachment.');
    const mime=match[1];let bytes;try{bytes=fromBase64(match[2]);}catch{fail(422,'INVALID_ATTACHMENT','Attachment base64 is invalid.');}if(!bytes.length||bytes.length>5*1024*1024)fail(422,'ATTACHMENT_TOO_LARGE','Each file must be at most 5 MB.');
    const signatures={'application/pdf':()=>ascii(bytes.subarray(0,5))==='%PDF-','image/png':()=>[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b),'image/jpeg':()=>bytes[0]===255&&bytes[1]===216,'image/webp':()=>ascii(bytes.subarray(0,4))==='RIFF'&&ascii(bytes.subarray(8,12))==='WEBP','application/vnd.openxmlformats-officedocument.wordprocessingml.document':()=>bytes[0]===80&&bytes[1]===75};
    if(!signatures[mime]?.())fail(422,'INVALID_ATTACHMENT','Attach a valid PDF, Word, JPG, PNG or WebP file.');
    const collision=await db.get('SELECT id FROM document_files WHERE id=?',[item.id]);if(collision)fail(422,'ATTACHMENT_EXISTS','Existing attachments must be referenced by ID without resending their data.');
    metadata={id:item.id,name:text(item.name,'File name',240),mime,size:bytes.length};files.push({...metadata,bytes,digest:toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))});
   }else{
    const stored=await db.get('SELECT id,name,mime,size FROM document_files WHERE id=? AND document_id=?',[item.id,record.id]);if(!stored||!previous)fail(422,'INVALID_ATTACHMENT','The referenced attachment does not belong to this document.');metadata=stored;
   }
   metadata.purpose=text(item.purpose||'supporting','File purpose',100);if(!Object.hasOwn(attachmentPurposes,metadata.purpose))fail(422,'INVALID_ATTACHMENT','Choose a valid file purpose.');metadata.caption=text(item.caption||'','Attachment description',10000);total+=metadata.size;record.attachments.push(metadata);
  }
  if(total>20*1024*1024)fail(422,'ATTACHMENTS_TOO_LARGE','All attached files together must be at most 20 MB.');
  if(new Set(record.attachments.map(item=>item.id)).size!==record.attachments.length)fail(422,'INVALID_ATTACHMENTS','An attachment can only appear once.');
  const parent=await db.get('SELECT id,document FROM reports WHERE id=?',[record.reportId]);if(!parent)fail(422,'INVALID_LINK','The linked inspection report no longer exists.');
  if(record.numberingMode==='automatic'&&!record.number){const base=documentNumberBase(JSON.parse(parent.document).reportNo,record.type);if(!base)fail(422,'INSPECTION_UNNUMBERED','Save a numbered inspection first, or use a manual document number.');record.number=(await allocateNumber(db,`document:${record.id}`,base,'document')).reference;}
  if(!record.number.trim()||record.number.length>200)fail(422,'INVALID_NUMBER','Enter a document number of at most 200 characters.');
  const context=contextOf(parent);if(new TextEncoder().encode(JSON.stringify(record)+JSON.stringify(context)).length>1500000)fail(422,'DOCUMENT_TOO_LARGE','Reduce the text content: document fields and inspection context together must be below 1.5 MB.');
  return {record,files,context};
 }
 async function write(record,context,files,previous,operation='saved',note=''){
  const id=record.id,version=(previous?.version||0)+1,mutation=crypto.randomUUID(),now=new Date().toISOString();
  const collision=await db.get('SELECT id FROM inspection_documents WHERE type=? AND number=? AND id<>?',[record.type,record.number,id]);if(collision)fail(409,'NUMBER_EXISTS','That document number is already in use.');
  const values=[record.reportId,record.type,record.number,record.revision,record.status,JSON.stringify(record),JSON.stringify(context),version,mutation,previous?.created_at||now,now,id];
  const statements=[previous?sql('UPDATE inspection_documents SET report_id=?,type=?,number=?,revision=?,status=?,document=?,context=?,version=?,mutation_id=?,created_at=?,updated_at=? WHERE id=? AND version=?',[...values,previous.version]):sql('INSERT INTO inspection_documents(report_id,type,number,revision,status,document,context,version,mutation_id,created_at,updated_at,id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',values)];
  if(previous&&record.type==='punch'&&record.status==='open'){statements[0].sql+=" AND NOT EXISTS(SELECT 1 FROM inspection_documents WHERE type='punch' AND status IN ('open','closure_requested') AND id<>? AND upper(trim(json_extract(context,'$.project')))=? AND upper(trim(json_extract(context,'$.vendor')))=? AND upper(trim(json_extract(context,'$.purchaseOrder')))=?)";statements[0].params.push(id,...['project','vendor','purchaseOrder'].map(key=>String(context[key]||'').trim().toUpperCase()));}
  for(const item of files){const storageKey=bucket?`documents/${id}/${item.id}-${item.digest}`:null;if(bucket)await bucket.put(storageKey,item.bytes,{httpMetadata:{contentType:item.mime}});statements.push(sql('INSERT INTO document_files(id,document_id,name,mime,size,digest,bytes,storage_key) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspection_documents WHERE id=? AND mutation_id=?)',[item.id,id,item.name,item.mime,item.size,item.digest,bucket?null:item.bytes,storageKey,id,mutation]));}
  statements.push(sql('INSERT INTO document_versions(document_id,version,document,context,operation,note,recorded_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspection_documents WHERE id=? AND mutation_id=?)',[id,version,JSON.stringify(record),JSON.stringify(context),operation,note,now,id,mutation]));
  statements.push(sql('INSERT INTO document_events(document_id,type,version,operation,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM inspection_documents WHERE id=? AND mutation_id=?)',[id,record.type,version,operation,now,id,mutation]));
  let result;try{result=await db.batch(statements);}catch(error){if(/FOREIGN KEY constraint/.test(error.message))fail(409,'INSPECTION_CHANGED','The linked inspection or document changed. Reload and try again.');if(/UNIQUE constraint/.test(error.message))fail(409,'NUMBER_EXISTS','That document number or attachment already exists.');throw error;}
  if(!result[0].changes)fail(409,'VERSION_CONFLICT','This document changed elsewhere. Reload it before saving.');
  return {...record,context,version,createdAt:previous?.created_at||now,updatedAt:now};
 }
 async function save(input,version,id){
  const previous=id?await row(id):null;if(id&&!previous)fail(404,'NOT_FOUND','Document not found.');
  if((previous?.version||0)!==version)fail(409,'VERSION_CONFLICT','This document changed elsewhere. Reload it before saving.');
  if(!previous&&await db.get('SELECT sequence FROM document_events WHERE document_id=? LIMIT 1',[input?.id||'']))fail(409,'ID_RETIRED','This document ID was previously deleted. Create a new document.');
  if(previous&&['issued','closed','closure_requested'].includes(previous.status))fail(409,'DOCUMENT_LOCKED','Revise or reopen the document before editing.');
  if(id&&input?.id!==id)fail(422,'INVALID_ID','Document ID does not match the URL.');
  const normalized=await normalize(input,previous);return write(normalized.record,normalized.context,normalized.files,previous,previous?'saved':'created');
 }
 async function transition(id,version,input){
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.action!=='string')fail(422,'INVALID_TRANSITION','Send an action and an optional reason.');
  const previous=await row(id);if(!previous)fail(404,'NOT_FOUND','Document not found.');if(previous.version!==version)fail(409,'VERSION_CONFLICT','This document changed elsewhere. Reload it.');
  const record=JSON.parse(previous.document),issue=issueTypes.includes(record.type),note=text(input.note||'','Reason',2000),action=input.action;
  if(action==='issue'&&record.status==='draft'){
   const messages=documentIssues(record);if(messages.length)fail(422,'DOCUMENT_INCOMPLETE','Complete the required fields before issuing.',messages);
   if(record.type==='punch'){
    const context=JSON.parse(previous.context);const existing=await db.get("SELECT id FROM inspection_documents WHERE type='punch' AND status IN ('open','closure_requested') AND id<>? AND upper(trim(json_extract(context,'$.project')))=? AND upper(trim(json_extract(context,'$.vendor')))=? AND upper(trim(json_extract(context,'$.purchaseOrder')))=? LIMIT 1",[id,...['project','vendor','purchaseOrder'].map(key=>String(context[key]||'').trim().toUpperCase())]);
    if(existing)fail(409,'OPEN_PUNCH_EXISTS','An open Punch list already exists for this project, vendor and purchase order. Update or close it before opening another.');
   }
   if(record.type==='irc'&&record.releaseDecision==='Released'&&(await db.get("SELECT count(*) AS n FROM inspection_documents WHERE report_id=? AND type IN ('punch','ncr') AND status IN ('open','closure_requested')",[record.reportId])).n)fail(422,'OPEN_QUALITY_ITEMS','Resolve open Punch/NCR records or choose a conditional/non-release decision.');
   record.status=issue?'open':'issued';
  }else if(action==='revise'&&!issue&&record.status==='issued'){record.revision=String(Number(record.revision)+1).padStart(2,'0');record.status='draft';if(record.type==='flash'){record.date=today();record.result='';for(const [key]of documentTypes.flash.fields)record[key]='';record.items=[newDocumentItem()];record.attachments=[];}}
  else if(action==='cancel-issue'&&!issue&&record.status==='issued'){if(!note.trim())fail(422,'REASON_REQUIRED','Enter a reason for cancelling the issue.');record.status='draft';}
  else if(action==='request-close'&&issue&&record.status==='open'){const messages=documentIssues(record,true);if(messages.length)fail(422,'CLOSURE_INCOMPLETE','Complete the closure requirements.',messages);record.status='closure_requested';}
  else if(action==='close'&&issue&&record.status==='closure_requested'){const messages=documentIssues(record,true);if(messages.length)fail(422,'CLOSURE_INCOMPLETE','Complete the closure requirements.',messages);record.status='closed';}
  else if(action==='cancel-close'&&issue&&record.status==='closure_requested'){if(!note.trim())fail(422,'REASON_REQUIRED','Enter a reason for cancelling the closure request.');record.status='open';}
  else if(action==='reopen'&&issue&&record.status==='closed'){if(!note.trim())fail(422,'REASON_REQUIRED','Enter a reason for reopening.');record.status='open';record.closedDate='';}
  else fail(409,'INVALID_TRANSITION','That action is not available for this document status.');
  return write(record,JSON.parse(previous.context),[],previous,action,note);
 }
 async function list(search){
  const where=[],values=[];
  for(const [key,column]of [['type','d.type'],['status','d.status'],['reportId','d.report_id']])if(search.get(key)){where.push(`${column}=?`);values.push(search.get(key));}
  for(const word of (search.get('q')||'').trim().split(/\s+/).filter(Boolean)){where.push("(EXISTS(SELECT 1 FROM json_tree(d.document) WHERE type IN ('text','integer','real') AND CAST(value AS TEXT) LIKE ? ESCAPE '\\') OR EXISTS(SELECT 1 FROM json_tree(d.context) WHERE type IN ('text','integer','real') AND CAST(value AS TEXT) LIKE ? ESCAPE '\\'))");values.push(like(word),like(word));}
  for(const [key,operator]of [['dateFrom','>='],['dateTo','<=']])if(search.get(key)){if(!parseDateToIso(search.get(key)))fail(400,'INVALID_DATE','Use ISO dates in document filters.');where.push(`json_extract(d.document,'$.date')${operator}?`);values.push(search.get(key));}
  const clause=where.length?` WHERE ${where.join(' AND ')}`:'';
  const limit=Number(search.get('limit')||50),offset=Number(search.get('offset')||0);if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)fail(400,'INVALID_PAGINATION','Use limit 1–100 and a non-negative offset.');
  const count=await db.get(`SELECT count(*) AS n FROM inspection_documents d${clause}`,values);
  const rows=await db.all(`SELECT d.* FROM inspection_documents d${clause} ORDER BY d.updated_at DESC,d.id LIMIT ? OFFSET ?`,[...values,limit,offset]);
  return {data:rows.map(value=>{const record=publicRecord(value);return {id:record.id,type:record.type,number:record.number,revision:record.revision,status:record.status,date:record.date,reportId:record.reportId,context:record.context,owner:record.owner,version:record.version,updatedAt:record.updatedAt,openItems:record.items.filter(item=>item.status!=='closed').length,files:record.attachments.length};}),meta:{total:count.n,limit,offset}};
 }
 async function history(id){await detail(id);return db.all('SELECT version,operation,note,recorded_at AS recordedAt FROM document_versions WHERE document_id=? ORDER BY version DESC',[id]);}
 async function purge(id){if(!bucket)return;let cursor;do{const page=await bucket.list({prefix:`documents/${id}/`,...(cursor?{cursor}:{})});if(page.objects.length)await bucket.delete(page.objects.map(item=>item.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);}
 async function remove(id,version){const previous=await row(id);if(!previous){if(await db.get("SELECT sequence FROM document_events WHERE document_id=? AND operation='deleted'",[id])){await purge(id);return;}fail(404,'NOT_FOUND','Document not found.');}if(previous.version!==version)fail(409,'VERSION_CONFLICT','This document changed elsewhere.');if(previous.status!=='draft')fail(409,'DOCUMENT_LOCKED','Only drafts can be deleted. Cancel the issue first.');
  const now=new Date().toISOString();const result=await db.batch([sql("INSERT INTO document_events(document_id,type,version,operation,updated_at) SELECT id,type,version+1,'deleted',? FROM inspection_documents WHERE id=? AND version=?",[now,id,version]),sql('DELETE FROM inspection_documents WHERE id=? AND version=?',[id,version])]);if(!result[1].changes)fail(409,'VERSION_CONFLICT','This document changed elsewhere.');try{await purge(id);}catch{fail(503,'FILE_CLEANUP_PENDING','The draft was deleted. Retry deletion to finish file cleanup.');}}
 async function exportRecord(id){const record=await detail(id);record.attachments=await Promise.all(record.attachments.map(async item=>{const stored=await file(id,item.id);return {...item,data:`data:${stored.mime};base64,${toBase64(stored.bytes)}`};}));return record;}
 return {detail,file,save,transition,list,history,remove,exportRecord};
}

export async function handleDocuments({request,path,db,bucket,cors,json,expected,body}){
 if(!path.startsWith('/api/v1/documents')&&path!=='/api/v1/document-changes')return null;
 const store=documentsRepository(db,bucket),url=new URL(request.url),method=request.method;
 if(path==='/api/v1/document-changes'&&method==='GET'){const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)fail(400,'INVALID_CURSOR','Use a non-negative change cursor.');const data=await db.all('SELECT sequence,document_id AS documentId,type,version,operation,updated_at AS updatedAt FROM document_events WHERE sequence>? ORDER BY sequence LIMIT 100',[after]);return json({data,meta:{nextAfter:data.at(-1)?.sequence||after}},200,cors);}
 if(path==='/api/v1/documents'&&method==='GET')return json(await store.list(url.searchParams),200,cors);
 if(path==='/api/v1/documents'&&method==='POST'){const data=await store.save(await body(request),0);return json({data},201,{...cors,ETag:`"${data.version}"`,Location:`/api/v1/documents/${data.id}`});}
 const match=/^\/api\/v1\/documents\/([^/]+)(?:\/(export|transitions|history|versions|files)(?:\/([^/]+))?)?$/.exec(path);
 if(!match)fail(404,'NOT_FOUND','Document route not found.');const id=decodeURIComponent(match[1]);if(!validId(id))fail(400,'INVALID_ID','Invalid document ID.');
 if(method==='GET'&&match[2]==='history')return json({data:await store.history(id)},200,cors);
 if(method==='GET'&&match[2]==='files'){
  const version=url.searchParams.has('version')?Number(url.searchParams.get('version')):undefined;if(version!==undefined&&(!Number.isSafeInteger(version)||version<1))fail(400,'INVALID_VERSION','Use a positive attachment version.');
  const stored=await store.file(id,decodeURIComponent(match[3]||''),version);
  const filename=encodeURIComponent(stored.name);return new Response(stored.bytes,{headers:{...cors,'Content-Type':stored.mime,'Content-Disposition':`attachment; filename="attachment"; filename*=UTF-8''${filename}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }
 if(method==='GET'&&(!match[2]||['versions','export'].includes(match[2]))){const historic=match[2]==='versions'?Number(match[3]):undefined;if(match[2]==='versions'&&(!Number.isSafeInteger(historic)||historic<1))fail(400,'INVALID_VERSION','Use a positive version.');const data=match[2]==='export'?await store.exportRecord(id):await store.detail(id,historic);return json({schemaVersion:'1.0',data},200,{...cors,ETag:`"${data.version}"`,...(match[2]==='export'?{'Content-Disposition':`attachment; filename="AES-document-${id}.json"`}:{})});}
 if(method==='POST'&&match[2]==='transitions'){const data=await store.transition(id,expected(request),await body(request));return json({data},200,{...cors,ETag:`"${data.version}"`});}
 if(method==='PUT'&&!match[2]){const data=await store.save(await body(request),expected(request),id);return json({data},200,{...cors,ETag:`"${data.version}"`});}
 if(method==='DELETE'&&!match[2]){await store.remove(id,expected(request));return new Response(null,{status:204,headers:cors});}
 fail(404,'NOT_FOUND','Document route not found.');
}
