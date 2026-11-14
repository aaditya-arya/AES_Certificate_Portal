import {fromBase64,ascii} from './binary.js';
import {newReport,columns,stages,issues,fieldCatalog,parseDateToIso} from '../src/model.js';
import {numberingCodes,reportNumberBase} from '../src/numbering.js';
const dateFields=new Set(fieldCatalog.filter(field=>field[4]==='date').map(field=>field[1]));
export class ApiError extends Error{constructor(status,code,message,details){super(message);this.status=status;this.code=code;this.details=details;}}
export const fail=(status,code,message,details)=>{throw new ApiError(status,code,message,details);};
export const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
const string=(value,path,max=100000)=>{if(typeof value==='number'&&Number.isFinite(value))value=String(value);if(typeof value!=='string'||value.length>max)fail(422,'INVALID_FIELD',`${path} must be text of at most ${max} characters.`);return value;};
export function workflow(report){return report.status==='ready'&&!issues(report).length?'completed':issues(report).length?'remaining':'draft';}
function image(value,path){
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
 if(!match)fail(422,'INVALID_IMAGE',`${path} must be a JPEG, PNG or WebP data URL.`);
 let bytes;try{bytes=fromBase64(match[2]);}catch{fail(422,'INVALID_IMAGE',`${path} contains invalid base64.`);}if(!bytes.length||bytes.length>6*1024*1024)fail(422,'IMAGE_TOO_LARGE',`${path} must be at most 6 MB.`);
 const type=match[1],signature=type==='png'?[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value):type==='jpeg'?bytes[0]===255&&bytes[1]===216:ascii(bytes.subarray(0,4))==='RIFF'&&ascii(bytes.subarray(8,12))==='WEBP';
 if(!signature)fail(422,'INVALID_IMAGE',`${path} does not contain the declared image format.`);
 return {mime:`image/${type}`,bytes};
}
export function normalizeReport(input,id){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'INVALID_REPORT','Send a report JSON object.');
 const result=newReport(),media=[];
 for(const key of Object.keys(input))if(!Object.hasOwn(result,key))fail(422,'UNKNOWN_FIELD',`Unknown report field: ${key}`);
 for(const [key,initial]of Object.entries(result)){
  if(['id','createdAt','updatedAt','completedSteps'].includes(key)||input[key]===undefined)continue;
  const value=input[key];
  if(Array.isArray(initial)){
   if(!Array.isArray(value)||value.length>(key==='photos'?100:1000))fail(422,'INVALID_ROWS',`${key} must be an array within the row limit.`);
   if(key==='stages'){if(value.some(item=>!stages.includes(item)))fail(422,'INVALID_STAGE','Unknown inspection stage.');result[key]=[...new Set(value)];continue;}
   result[key]=value.map((row,index)=>{
    if(!row||typeof row!=='object'||Array.isArray(row))fail(422,'INVALID_ROW',`${key}[${index}] must be an object.`);
    const clean={id:row.id||crypto.randomUUID()};if(!validId(clean.id))fail(422,'INVALID_ID',`Invalid ${key} row ID.`);
    for(const name of key==='photos'?['caption','name']:columns[key].map(column=>column[0])){const value=string(row[name]??'',`${key}[${index}].${name}`);clean[name]=columns[key]?.some(column=>column[0]===name&&column[2]==='date')?parseDateToIso(value)||value:value;}
    if(key==='photos'){const data=string(row.data,`photos[${index}].data`,12000000);media.push({id:`photo-${clean.id}`,...image(data,`photos[${index}].data`)});clean.data='';}
    return clean;
   });
   if(new Set(result[key].map(row=>row.id)).size!==result[key].length)fail(422,'DUPLICATE_ROW','Row IDs must be unique within each table.');
   if(!result[key].length&&key!=='photos')result[key]=initial;
  }else if(typeof initial==='boolean'){if(typeof value!=='boolean')fail(422,'INVALID_FIELD',`${key} must be true or false.`);result[key]=value;}
  else if(key.endsWith('Signature')){const data=string(value,key,12000000);if(data)media.push({id:key,...image(data,key)});result[key]='';}
  else{const text=string(value,key,key==='activityDetails'?2000000:100000);result[key]=dateFields.has(key)?parseDateToIso(text)||text:text;}
 }
 result.id=id||input.id||result.id;if(!validId(result.id))fail(422,'INVALID_ID','Invalid report ID.');
 if(input.createdAt!==undefined){if(typeof input.createdAt!=='string'||!Number.isFinite(Date.parse(input.createdAt)))fail(422,'INVALID_FIELD','createdAt must be an ISO date-time.');result.createdAt=new Date(input.createdAt).toISOString();}
 if(result.requesterIsClient)result.requester=result.client;
 if(result.locationIsManufacturer)result.locationOrganization=result.manufacturer;
 if(!input.numberingMode)result.numberingMode=input.reportNo?'manual':'automatic';
 if(!['automatic','manual'].includes(result.numberingMode))fail(422,'INVALID_NUMBERING','Select automatic or manual numbering.');
 if(result.numberingMode==='automatic'){Object.assign(result,numberingCodes(result));for(const key of ['clientCode','manufacturerCode','inspectorCode'])if(result[key]&&!/^[A-Z0-9]{1,12}$/.test(result[key]))fail(422,'INVALID_CODE','Use up to 12 letters or digits for each numbering code.');}
 if(input.id&&id&&input.id!==id)fail(422,'ID_MISMATCH','The report ID must match the URL.');
 if(result.overallResult&&!['Accepted','Accepted with comments','Rejected'].includes(result.overallResult))fail(422,'INVALID_RESULT','Select a valid overall inspection result.');
 if(!['draft','ready'].includes(result.status))fail(422,'INVALID_STATUS','Status must be draft or ready.');
 if(!['template','custom'].includes(result.activityDetailsMode))fail(422,'INVALID_MODE','Activity text mode must be template or custom.');
 const pending=issues(result).filter(issue=>!(result.numberingMode==='automatic'&&!result.reportNo&&reportNumberBase(result)&&issue.message==='Enter the inspection visit report number.'));
 if(result.status==='ready'&&pending.length)fail(422,'INCOMPLETE_REPORT','Required details are missing.',pending);
 result.completedSteps=result.status==='ready'?[0,1,2,3,4,5,6]:[];
 return {report:result,media};
}
