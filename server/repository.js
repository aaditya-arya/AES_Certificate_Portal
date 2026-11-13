import {toBase64,toHex} from './binary.js';
import {ApiError,workflow} from './validation.js';
import {narrative,location,requester,endDateDisplay,parseDateToIso} from '../src/model.js';
const statement=(sql,params=[])=>({sql,params});
const like=value=>`%${value.replace(/[\\%_]/g,'\\$&')}%`;
export function repository(db,bucket=null){
 const getRow=id=>db.get('SELECT * FROM reports WHERE id=?',[id]);
 async function purgeMedia(id){if(!bucket)return;let cursor;do{const page=await bucket.list({prefix:`reports/${id}/`,...(cursor?{cursor}:{})});if(page.objects.length)await bucket.delete(page.objects.map(object=>object.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);}
 async function getMedia(id,mediaId){
  const row=await db.get('SELECT * FROM report_media WHERE report_id=? AND media_id=?',[id,mediaId]);if(!row)return null;
  let bytes;if(row.storage_key){const object=await bucket.get(row.storage_key);if(!object)throw new ApiError(503,'MISSING_MEDIA','A stored photograph is temporarily unavailable.');bytes=new Uint8Array(await object.arrayBuffer());}
  else bytes=(await db.get('SELECT bytes FROM media_blobs WHERE digest=?',[row.digest]))?.bytes;
  if(!bytes)throw new ApiError(503,'MISSING_MEDIA','A stored photograph is temporarily unavailable.');
  return {mime:row.mime,bytes};
 }
 async function detail(id){
  const row=await getRow(id);if(!row)return null;const report=JSON.parse(row.document);
  const media=await db.all('SELECT media_id FROM report_media WHERE report_id=?',[id]);
  await Promise.all(media.map(async({media_id})=>{const image=await getMedia(id,media_id);const data=`data:${image.mime};base64,${toBase64(image.bytes)}`;
   if(media_id.startsWith('photo-')){const photo=report.photos.find(item=>`photo-${item.id}`===media_id);if(photo)photo.data=data;}else report[media_id]=data;
  }));
  return {report,version:row.version,workflow:row.workflow,updatedAt:row.updated_at,derived:{openingParagraph:narrative(report),inspectionLocation:location(report,true),requester:requester(report),inspectionEndDate:endDateDisplay(report.inspectionDate,report.duration)}};
 }
 async function save(normalized,expectedVersion){
  const {report,media}=normalized,id=report.id,previous=await getRow(id),now=new Date().toISOString(),mutation=crypto.randomUUID(),version=expectedVersion+1;
  if((previous?.version||0)!==expectedVersion)throw new ApiError(409,'VERSION_CONFLICT','This report changed elsewhere. Reload it before saving.');
  if(expectedVersion===0&&!previous&&await db.get('SELECT sequence FROM report_changes WHERE report_id=? LIMIT 1',[id]))throw new ApiError(409,'ID_RETIRED','This report ID was deleted. Create a new report with a new ID.');
  report.createdAt=previous?.created_at||report.createdAt||now;report.updatedAt=now;
  const sql=[];
  const values=[JSON.stringify(report),version,mutation,workflow(report),report.reportNo,report.client,report.project,parseDateToIso(report.inspectionDate)||'',report.status,report.createdAt,now,id];
  if(expectedVersion===0)sql.push(statement('INSERT INTO reports (document,version,mutation_id,workflow,report_no,client,project,inspection_date,status,created_at,updated_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',values));
  else sql.push(statement('UPDATE reports SET document=?,version=?,mutation_id=?,workflow=?,report_no=?,client=?,project=?,inspection_date=?,status=?,created_at=?,updated_at=? WHERE id=? AND version=?',[...values,expectedVersion]));
  sql.push(statement('DELETE FROM report_media WHERE report_id=? AND EXISTS(SELECT 1 FROM reports WHERE id=? AND mutation_id=?)',[id,id,mutation]));
  for(const item of media){
   const digest=toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',item.bytes)));
   const storageKey=bucket?`reports/${id}/${digest}`:null;
   if(bucket)await bucket.put(storageKey,item.bytes,{httpMetadata:{contentType:item.mime}});
   else sql.push(statement('INSERT INTO media_blobs(digest,mime,bytes) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM reports WHERE id=? AND mutation_id=?) ON CONFLICT(digest) DO NOTHING',[digest,item.mime,item.bytes,id,mutation]));
   sql.push(statement('INSERT INTO report_media(report_id,media_id,mime,storage_key,digest) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM reports WHERE id=? AND mutation_id=?)',[id,item.id,item.mime,storageKey,digest,id,mutation]));
  }
  sql.push(statement('INSERT INTO report_changes(report_id,version,operation,updated_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM reports WHERE id=? AND mutation_id=?)',[id,version,expectedVersion?'updated':'created',now,id,mutation]));
  if(!bucket)sql.push(statement('DELETE FROM media_blobs WHERE digest NOT IN (SELECT digest FROM report_media)'));
  const result=await db.batch(sql);if(!result[0].changes){if(bucket&&!await getRow(id))await purgeMedia(id);throw new ApiError(409,'VERSION_CONFLICT','This report changed elsewhere. Reload it before saving.');}
  return {id,version,workflow:workflow(report),updatedAt:now,createdAt:report.createdAt};
 }
 async function remove(id,version){
  const previous=await getRow(id);if(!previous){if(bucket&&await db.get("SELECT sequence FROM report_changes WHERE report_id=? AND operation='deleted' LIMIT 1",[id])){await purgeMedia(id);return;}throw new ApiError(404,'NOT_FOUND','Report not found.');}if(previous.version!==version)throw new ApiError(409,'VERSION_CONFLICT','This report changed elsewhere. Reload it before deleting.');
  const stamp=new Date().toISOString(),sql=[statement('INSERT INTO report_changes(report_id,version,operation,updated_at) SELECT id,version+1,?,? FROM reports WHERE id=? AND version=?',['deleted',stamp,id,version]),statement('DELETE FROM reports WHERE id=? AND version=?',[id,version])];
  if(!bucket)sql.push(statement('DELETE FROM media_blobs WHERE digest NOT IN (SELECT digest FROM report_media)'));
  const result=await db.batch(sql);if(!result[1].changes)throw new ApiError(409,'VERSION_CONFLICT','This report changed elsewhere.');
  if(bucket){try{await purgeMedia(id);}catch{throw new ApiError(503,'MEDIA_CLEANUP_PENDING','The report was deleted. Retry deleting it to finish image cleanup.');}}
 }
 async function list(search){
  const where=[],params=[];const eq=(column,value)=>{if(value){where.push(`${column}=?`);params.push(value);}};
  eq('workflow',search.get('workflow'));eq('status',search.get('status'));const from=search.get('dateFrom'),to=search.get('dateTo');
  if(from||to)where.push("inspection_date<>''");
  if(from){where.push('inspection_date>=?');params.push(from);}if(to){where.push('inspection_date<=?');params.push(to);}
  const stage=search.get('stage');if(stage){where.push("EXISTS(SELECT 1 FROM json_each(document,'$.stages') WHERE value=?)");params.push(stage);}
  const by=search.get('searchBy')||'all',q=search.get('q')||'';const fields={reportNo:'report_no',client:'client',project:'project',manufacturer:"json_extract(document,'$.manufacturer')",inspector:"json_extract(document,'$.inspector')"};
  for(const word of q.trim().split(/\s+/).filter(Boolean)){
   if(fields[by])where.push(`${fields[by]} LIKE ? ESCAPE '\\'`);
   else if(by==='equipment')where.push("EXISTS(SELECT 1 FROM json_each(document,'$.equipment') WHERE json_extract(value,'$.description') LIKE ? ESCAPE '\\')");
   else if(by==='location')where.push("(coalesce(json_extract(document,'$.locationOrganization'),'')||' '||coalesce(json_extract(document,'$.manufacturer'),'')||' '||coalesce(json_extract(document,'$.area'),'')||' '||coalesce(json_extract(document,'$.city'),'')||' '||coalesce(json_extract(document,'$.state'),'')) LIKE ? ESCAPE '\\'");
   else where.push("EXISTS(SELECT 1 FROM json_tree(document) WHERE type IN ('text','integer','real') AND CAST(value AS TEXT) LIKE ? ESCAPE '\\')");
   params.push(like(word));
  }
  const accreditation=search.get('accreditation');if(accreditation){where.push("EXISTS(SELECT 1 FROM json_each(document,'$.calibration') WHERE upper(json_extract(value,'$.traceability'))=?)");params.push(accreditation.toUpperCase());}
  const clause=where.length?` WHERE ${where.join(' AND ')}`:'';const total=(await db.get(`SELECT count(*) AS n FROM reports${clause}`,params)).n;
  const limit=Math.min(100,Math.max(1,Number(search.get('limit'))||50)),offset=Math.max(0,Number(search.get('offset'))||0);
  const rows=await db.all(`SELECT id,version,workflow,report_no,client,project,inspection_date,status,created_at,updated_at,json_extract(document,'$.manufacturer') AS manufacturer,json_extract(document,'$.stages') AS stages FROM reports${clause} ORDER BY updated_at DESC,id LIMIT ? OFFSET ?`,[...params,limit,offset]);
  return {items:rows.map(row=>({id:row.id,version:row.version,workflow:row.workflow,reportNo:row.report_no,client:row.client,project:row.project,manufacturer:row.manufacturer,inspectionDate:row.inspection_date,status:row.status,stages:JSON.parse(row.stages||'[]'),createdAt:row.created_at,updatedAt:row.updated_at})),total,limit,offset};
 }
 async function dashboard(){const rows=await db.all('SELECT workflow,count(*) AS count FROM reports GROUP BY workflow');const counts={completed:0,draft:0,remaining:0,total:0};for(const row of rows){counts[row.workflow]=row.count;counts.total+=row.count;}return counts;}
 async function changes(after=0,limit=100){return db.all('SELECT sequence,report_id AS reportId,version,operation,updated_at AS updatedAt FROM report_changes WHERE sequence>? ORDER BY sequence LIMIT ?',[after,Math.min(500,limit)]);}
 return {detail,save,remove,list,dashboard,changes,getMedia};
}
