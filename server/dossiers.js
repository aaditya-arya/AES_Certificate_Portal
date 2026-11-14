import {fail,validId} from './validation.js';
import {newAssignment,assignmentFields,resourceGroups} from '../src/dossier-model.js';
import {parseDateToIso,issues} from '../src/model.js';
import {fromBase64,ascii} from './binary.js';
const sql=(sql,params=[])=>({sql,params});
const txt=(v,max=10000)=>{if(typeof v!=='string'||v.length>max)fail(422,'INVALID_FIELD','Enter text within the field length limit.');return v;};
export async function handleDossiers({request,path,db,bucket,cors,json,expected,body}){
 const match=/^\/api\/v1\/reports\/([^/]+)\/dossier(?:\/(files|issue|cancel-issue)(?:\/([^/]+))?)?$/.exec(path);if(!match)return null;
 const [,id,action,fileId]=match;if(!validId(id))fail(400,'INVALID_ID','Invalid inspection ID.');
 const parent=await db.get('SELECT * FROM reports WHERE id=?',[id]);if(!parent)fail(404,'NOT_FOUND','Inspection not found.');
 let row=await db.get('SELECT * FROM inspection_dossiers WHERE report_id=?',[id]);
 if(!row){await db.batch([sql('INSERT INTO inspection_dossiers(report_id,document,version,mutation_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(report_id) DO NOTHING',[id,JSON.stringify(newAssignment()),1,crypto.randomUUID(),new Date().toISOString()])]);row=await db.get('SELECT * FROM inspection_dossiers WHERE report_id=?',[id]);}
 const detail=async()=>({assignment:JSON.parse(row.document),version:row.version,reportVersion:parent.version,issuedFile:row.issued_file,files:(await db.all('SELECT id,category,name,mime,size,metadata,created_at AS createdAt FROM dossier_files WHERE report_id=? ORDER BY created_at,id',[id])).map(f=>({...f,...JSON.parse(f.metadata),metadata:undefined})),documents:await db.all('SELECT id,type,number,status,revision FROM inspection_documents WHERE report_id=? ORDER BY type,updated_at DESC',[id]),history:await db.all('SELECT operation,note,recorded_at AS recordedAt FROM dossier_events WHERE report_id=? ORDER BY id DESC LIMIT 100',[id])});
 const method=request.method;
 if(!action&&method==='GET')return json({data:await detail()},200,{...cors,ETag:`"${row.version}"`});
 if(action==='files'&&fileId&&method==='GET'){
  const f=await db.get('SELECT * FROM dossier_files WHERE id=? AND report_id=?',[fileId,id]);if(!f)fail(404,'NOT_FOUND','File not found.');let bytes=f.bytes;if(f.storage_key){const object=await bucket.get(f.storage_key);if(!object)fail(503,'FILE_UNAVAILABLE','File temporarily unavailable.');bytes=new Uint8Array(await object.arrayBuffer());}
  return new Response(bytes,{headers:{...cors,'Content-Type':f.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(f.name)}`}});
 }
 const version=expected(request);if(version!==row.version)fail(409,'VERSION_CONFLICT','The dossier changed elsewhere. Reload before saving.');
 const mutation=crypto.randomUUID(),now=new Date().toISOString(),commands=[];let note='',operation='';let assignment=JSON.parse(row.document),issued=row.issued_file;
 const condition='EXISTS(SELECT 1 FROM inspection_dossiers WHERE report_id=? AND mutation_id=?)';
 const guard=[id,mutation];let stagedKey=null;
 async function addFile(input,category){
  if(!input||!Object.hasOwn(resourceGroups,category)&&category!=='issued-ir')fail(422,'INVALID_CATEGORY','Select a resource group.');
  const name=txt(input.name,240);if(!name.trim())fail(422,'INVALID_FILE','A file name is required.');const m=/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(input.data||'');if(!m)fail(422,'INVALID_FILE','Send a base64 file.');let bytes;try{bytes=fromBase64(m[2]);}catch{fail(422,'INVALID_FILE','Invalid file encoding.');}if(!bytes.length||bytes.length>5*1024*1024)fail(422,'FILE_TOO_LARGE','Files must be at most 5 MB.');
  const mime=m[1],head=ascii(bytes.subarray(0,5)),zip=bytes[0]===80&&bytes[1]===75;const valid=mime==='application/pdf'?head==='%PDF-':mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216:['application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)?zip:false;
  if(!valid||category==='issued-ir'&&mime!=='application/pdf')fail(422,'INVALID_FILE','Use a valid PDF, DOCX, XLSX, ZIP, PNG or JPEG.');
  const metadata=Object.fromEntries(['description','documentNo','revision','approvalCode','itemTag'].map(k=>[k,txt(input[k]||'')]));if(!metadata.description.trim())fail(422,'DESCRIPTION_REQUIRED','Describe the uploaded file.');
  const fid=crypto.randomUUID(),key=bucket?`dossiers/${id}/${fid}`:null;if(bucket){await bucket.put(key,bytes,{httpMetadata:{contentType:mime}});stagedKey=key;}
  commands.push(sql(`INSERT INTO dossier_files(id,report_id,category,name,mime,size,metadata,bytes,storage_key,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${condition}`,[fid,id,category,name,mime,bytes.length,JSON.stringify(metadata),bucket?null:bytes,key,now,...guard]));return fid;
 }
 if(!action&&method==='PUT'){
  if(issued)fail(409,'REPORT_ISSUED','Cancel the IR issue before changing its dossier.');const input=await body(request);assignment=newAssignment();for(const key of Object.keys(input))if(!Object.hasOwn(assignment,key))fail(422,'UNKNOWN_FIELD',`Unknown assignment field: ${key}`);
  for(const [key,,kind,options]of assignmentFields){assignment[key]=txt(input[key]??'');if(kind==='date'&&assignment[key]&&!parseDateToIso(assignment[key]))fail(422,'INVALID_DATE','Enter a valid assignment date.');if(kind==='select'&&assignment[key]&&!options.includes(assignment[key]))fail(422,'INVALID_FIELD','Select a witness method.');}
  assignment.state=txt(input.state||'pending');if(!['pending','assigned','in_progress','completed','cancelled'].includes(assignment.state))fail(422,'INVALID_STATE','Choose an assignment state.');if(typeof input.clientWitness!=='boolean')fail(422,'INVALID_FIELD','Client witness must be true or false.');assignment.clientWitness=input.clientWitness;
  if(assignment.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignment.contactEmail))fail(422,'INVALID_EMAIL','Enter a valid contact email.');if(assignment.manDays&&(!Number.isFinite(Number(assignment.manDays))||Number(assignment.manDays)<=0))fail(422,'INVALID_FIELD','Man-days must be a positive number.');
  if(['assigned','in_progress','completed'].includes(assignment.state)&&(!assignment.assignmentNo.trim()||!assignment.method||!assignment.inspectionAgency.trim()||!JSON.parse(parent.document).inspector.trim()))fail(422,'ASSIGNMENT_INCOMPLETE','Enter assignment number, method, agency and inspector before assigning.');operation='assignment-saved';
 }else if(action==='files'&&!fileId&&method==='POST'){
  if(issued)fail(409,'REPORT_ISSUED','Cancel the IR issue before changing resources.');const input=await body(request);await addFile(input,input.category);operation='file-added';note=input.name;
 }else if(action==='files'&&fileId&&method==='DELETE'){
  const f=await db.get('SELECT * FROM dossier_files WHERE report_id=? AND id=?',[id,fileId]);if(!f)fail(404,'NOT_FOUND','File not found.');if(issued||f.category==='issued-ir')fail(409,'IMMUTABLE_FILE','Issued evidence must be retained.');
  commands.push(sql(`DELETE FROM dossier_files WHERE id=? AND report_id=? AND ${condition}`,[fileId,id,...guard]));operation='file-removed';note=f.name;
  // R2 objects are retained as audit evidence; SQL removal makes them inaccessible.
 }else if(action==='issue'&&method==='POST'){
  if(issued)fail(409,'REPORT_ISSUED','This IR is already issued.');const input=await body(request),report=JSON.parse(parent.document),pending=issues(report).map(i=>i.message);if(!['Accepted','Accepted with comments','Rejected'].includes(report.overallResult))pending.push('Select the overall inspection result.');if(!await db.get("SELECT media_id FROM report_media WHERE report_id=? AND media_id='inspectorSignature'",[id]))pending.push('Upload the inspector stamp / signature.');if(!assignment.assignmentNo||!assignment.method||!assignment.inspectionAgency)pending.push('Complete the inspection assignment.');if(pending.length)fail(422,'IR_INCOMPLETE','Complete the inspection before issuing.',pending);if(input.reportVersion!==parent.version)fail(409,'VERSION_CONFLICT','The inspection changed. Reload before issuing.');
  issued=await addFile({...input,description:`Issued inspection report, source version ${parent.version}`},'issued-ir');operation='ir-issued';note=`Inspection version ${parent.version}`;
 }else if(action==='cancel-issue'&&method==='POST'){
  if(!issued)fail(409,'NOT_ISSUED','This IR is not issued.');note=txt((await body(request)).reason||'',2000);if(!note.trim())fail(422,'REASON_REQUIRED','Enter the reason for cancelling the issue.');issued=null;operation='ir-issue-cancelled';
 }else fail(405,'METHOD_NOT_ALLOWED','Unsupported dossier operation.');
 // Parent version participates in every mutation: concurrent issue/edit/resource changes cannot pass independently.
 const statements=[sql('UPDATE reports SET version=version+1,mutation_id=?,updated_at=? WHERE id=? AND version=?',[mutation,now,id,parent.version]),sql('UPDATE inspection_dossiers SET document=?,issued_file=?,version=version+1,mutation_id=?,updated_at=? WHERE report_id=? AND version=? AND EXISTS(SELECT 1 FROM reports WHERE id=? AND mutation_id=?)',[JSON.stringify(assignment),issued,mutation,now,id,version,id,mutation]),...commands,sql(`INSERT INTO dossier_events(report_id,operation,note,recorded_at) SELECT ?,?,?,? WHERE ${condition}`,[id,operation,note,now,...guard]),sql(`INSERT INTO report_changes(report_id,version,operation,updated_at) SELECT ?,?,'updated',? WHERE ${condition}`,[id,parent.version+1,now,...guard])];
 let result;try{result=await db.batch(statements);}catch(error){if(stagedKey)await bucket.delete(stagedKey);throw error;}if(!result[1].changes){if(stagedKey)await bucket.delete(stagedKey);fail(409,'VERSION_CONFLICT','The inspection or dossier changed elsewhere. Reload before trying again.');}row=await db.get('SELECT * FROM inspection_dossiers WHERE report_id=?',[id]);parent.version++;return json({data:await detail()},200,{...cors,ETag:`"${row.version}"`});
}
