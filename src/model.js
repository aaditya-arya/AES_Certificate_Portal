export const stages = ['Pre-Inspection Meeting', 'In-Process Inspection', 'Final Inspection', 'Pre-Shipment Inspection'];
export const sections = ['Report details', 'Equipment & documents', 'Inspection activities', 'Findings & calibration', 'Photographs', 'Expenditure & sign-off', 'Review & export'];
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const displayDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('.') : value || '';
export const uid = () => crypto.randomUUID();
export const columns = {
 equipment: [['itemNo','PO item no.'],['description','Item description'],['poQty','PO qty. (UOM)'],['offeredQty','Offered qty. (UOM)'],['inspectedQty','Inspected qty. (UOM)']],
 documents: [['description','Document description'],['number','Document number'],['revision','Revision'],['date','Date','date'],['status','Approval status']],
 activities: [['clause','ITP/QAP clause'],['description','Activity description'],['quantum','Quantum of check'],['scope','Scope','scope']],
 calibration: [['instrument','Details of instrument'],['identity','Make / Model / ID / Sr. no.'],['date','Calibration date','date'],['due','Due date','date'],['traceability','Traceability to NABL/NPL']],
 expenses: [['date','Date','date'],['entry','Entry time','time'],['exit','Exit time','time'],['travel','Traveling time'],['km','Total KM (RT)','number']],
 persons: [['name','Person name'],['organization','On behalf of (organization)']],
};
export function blankRow(type){const r={id:uid()};for(const [key] of columns[type])r[key]='';return r;}
export function newReport(){return {
 id:uid(), createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'draft',
 reportNo:'',revision:'00',reportDate:today(),client:'',project:'',vendorPO:'',vendorPODate:'',notification:'',notificationDate:'',manufacturer:'',aesPO:'',aesPODate:'',
 requester:'',requesterIsClient:true,locationOrganization:'',locationIsManufacturer:true,area:'',city:'',state:'',postalCode:'',street:'',inspectionDate:'',duration:'1',
 stages:[],persons:[blankRow('persons')],equipment:[blankRow('equipment')],documents:[blankRow('documents')],standards:'',
 activityGroupCode:'',activityGroup:'',activitySubgroupCode:'',activitySubgroup:'',activities:[blankRow('activities')],activityDetails:'',
 calibration:[blankRow('calibration')],conclusion:'',pending:'',identification:'',nonconformities:'',enclosures:'',photos:[],expenses:[blankRow('expenses')],
 inspector:'',inspectorDate:'',reviewer:'',reviewerDate:'',inspectorSignature:'',reviewerSignature:''
};}
export function requester(r){return r.requesterIsClient?r.client:r.requester;}
export function locationOrganization(r){return r.locationIsManufacturer?r.manufacturer:r.locationOrganization;}
export function location(r,full=false){return [locationOrganization(r),full?r.street:'',r.area,full?r.city:'',r.state,full?r.postalCode:''].filter(Boolean).join(', ');}
export function narrative(r){return `As requested by ${requester(r)||'[inspection requester]'} inspection carried out at ${location(r)||'[inspection location up to state]'} On ${displayDate(r.inspectionDate)||'[inspection date]'} and scope of services as described below.`;}
export function po(value,date){return [value,date?`Dated: ${displayDate(date)}`:''].filter(Boolean).join('; ');}
export function generalRows(r){return [
 ['Client Name:',r.client],['Project Name:',r.project],['P.O. Number\n(Client to Vendor):',po(r.vendorPO,r.vendorPODate)],['Inspection Notification No.:',po(r.notification,r.notificationDate)],['Manufacturer/Supplier:',r.manufacturer],['PO Number (Client to AES):',po(r.aesPO,r.aesPODate)],['Place of Inspection:',location(r,true)],['Inspection Requested By:',requester(r)],['Date of Inspection:',`${displayDate(r.inspectionDate)}${r.inspectionDate&&r.duration?` (${r.duration} ${Number(r.duration)===1?'Day':'Days'}).`:''}`],['Person Present:',r.persons.map(p=>[p.name,p.organization?`OBO ${p.organization}`:''].filter(Boolean).join(' ')).filter(Boolean).join('\n')]
 ];}
export const calibrationRemark='Remark: If Instrument calibrated from Non-NABL or do not have traceability of NABL / other calibration bodies, then the scope of review is limited to technical content in the calibration certificate.';
export function issues(r){const result=[];const require=(v,msg,section)=>{if(!String(v||'').trim())result.push({message:msg,section});};
 require(r.reportNo,'Enter the inspection visit report number.',0);require(r.reportDate,'Enter the report date.',0);require(r.revision,'Enter the revision.',0);require(r.client,'Enter the client name.',0);require(r.project,'Enter the project name.',0);require(r.manufacturer,'Enter the manufacturer / supplier.',0);require(requester(r),'Enter the inspection requester.',0);require(r.inspectionDate,'Enter the inspection date.',0);require(locationOrganization(r),'Enter the inspection organization.',0);require(r.state,'Enter the state of inspection.',0);
 if(!r.stages.length)result.push({message:'Select at least one inspection stage.',section:0});
 if(!r.equipment.some(x=>x.description.trim()))result.push({message:'Describe at least one inspected item.',section:1});
 require(r.activityDetails,'Enter details of the activities carried out.',2);require(r.conclusion,'Add the inspection conclusion.',3);require(r.inspector,'Enter the inspector’s name.',5);require(r.inspectorDate,'Enter the inspector sign-off date.',5);require(r.reviewer,'Enter the reviewer’s name.',5);require(r.reviewerDate,'Enter the reviewer sign-off date.',5);
 for(const [i,p] of r.photos.entries())if(!p.caption.trim())result.push({message:`Add a description for photograph ${i+1}.`,section:4});
 for(const [i,row] of r.calibration.entries())if(row.date&&row.due&&row.due<row.date)result.push({message:`Instrument ${i+1}: due date precedes calibration date.`,section:3});
 for(const [i,row] of r.expenses.entries())if(row.entry&&row.exit&&row.exit<row.entry)result.push({message:`Expenditure row ${i+1}: exit is earlier than entry. Use separate dated rows for overnight visits.`,section:5});
 return result;}
export function progress(r){const required=[r.reportNo,r.client,r.project,r.manufacturer,r.inspectionDate,r.state,r.stages.length,r.equipment.some(x=>x.description.trim()),r.activityDetails,r.conclusion,r.inspector,r.reviewer];return Math.round(required.filter(Boolean).length/required.length*100);}
export function timeText(t){if(!t)return '';const [h,m]=t.split(':');return `${String(+h%12||12).padStart(2,'0')}:${m} ${+h>=12?'PM':'AM'}`;}
export async function loadExample(){const res=await fetch('/example/tables.json');if(!res.ok)throw Error('Could not load reference example.');const t=await res.json();const r=newReport();
 const date=s=>{const m=s.match(/(\d{2})[.-](\d{2})[.-](\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:'';};
 Object.assign(r,{reportNo:'AESPL/IACL/BEPL/IR/AS/2611/0701',reportDate:'2026-11-07',client:t[0][0][1],project:t[0][1][1],vendorPO:'PO/JFD/CP/ELE/10',vendorPODate:'2026-05-23',notification:'As per Email',notificationDate:'2026-11-03',manufacturer:t[0][4][1],aesPO:'1014000087',aesPODate:'2026-09-16',area:'Airoli',city:'Navi Mumbai',state:'Maharashtra',postalCode:'400708',inspectionDate:'2026-11-07',stages:['Final Inspection'],persons:[{id:uid(),name:'Mr. Sudhakar Joshi',organization:'Akshar Engineering Services Pvt. Ltd.'},{id:uid(),name:'Mr. Sharad Potdar',organization:'Bharat Bijlee Limited.'}],activityGroupCode:'B',activityGroup:'IN-PROCESS',activitySubgroupCode:'4',activitySubgroup:'TANKING',activityDetails:t[5][0][0],conclusion:t[7][0][0].replace(/^Conclusion:\s*/,''),pending:t[8][0][0].replace(/^Pending Activities:\s*/,''),identification:'NIL',nonconformities:'NIL',enclosures:t[11][0][0].replace(/^Enclosure:\s*/,''),inspector:'Sudhakar Joshi',reviewer:'Hitesh Prajapati',inspectorDate:'2026-11-07',reviewerDate:'2026-11-07'});
 for(const [key,ix,start,end] of [['equipment',2,1],['documents',3,2],['activities',4,3],['calibration',6,1,3]])r[key]=t[ix].slice(start,end).map(row=>Object.fromEntries([['id',uid()],...columns[key].map(([key,type,format],i)=>[key,format==='date'?date(row[i]):row[i]])]));
 r.expenses=[{id:uid(),date:'2026-11-07',entry:'09:30',exit:'17:03',travel:'01 Hr.',km:'12'}];
 r.photos=await Promise.all(Array.from({length:8},async(_,i)=>{const b=await(await fetch(`/example/photo-${i+1}.jpeg`)).blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(b);});return {id:uid(),data,caption:t[12][Math.floor(i/2)*2+1][i%2],name:`reference-${i+1}.jpeg`};}));return r;
}
// Imports accept report data only; imported completion state must be rechecked.
export function validateImport(data){
 const list=data?.format==='aes-report-backup-v1'?data.reports:null;if(!Array.isArray(list)||!list.length||list.length>200)throw Error('Choose a valid AES report backup (maximum 200 reports).');
 return list.map(raw=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid report in backup.');const seed=newReport();const r={...seed};for(const key of Object.keys(seed)){
  if(Array.isArray(seed[key])){if(!Array.isArray(raw[key])||raw[key].length>1000)throw Error(`Invalid ${key} in backup.`);if(key==='stages'){r.stages=raw.stages.filter(v=>stages.includes(v));continue;}r[key]=raw[key].map(row=>{if(!row||typeof row!=='object')throw Error(`Invalid ${key} row.`);const clean={id:uid()};for(const k of key==='photos'?['data','caption','name']:columns[key].map(c=>c[0])){if(typeof row[k]!=='string'||row[k].length>20_000_000)throw Error(`Invalid ${key} value.`);clean[k]=row[k];}if(key==='photos'&&!/^data:image\/(png|jpeg);base64,/.test(clean.data))throw Error('Unsupported image in backup.');return clean;});if(!r[key].length&&key!=='photos')r[key]=[blankRow(key)];
  }else if(typeof seed[key]==='string'&&typeof raw[key]==='string')r[key]=raw[key].slice(0,100000);else if(typeof seed[key]==='boolean'&&typeof raw[key]==='boolean')r[key]=raw[key];
 }for(const key of ['inspectorSignature','reviewerSignature'])if(r[key]&&!/^data:image\/(png|jpeg);base64,/.test(r[key]))throw Error('Unsupported signature in backup.');r.id=uid();r.status='draft';r.updatedAt=new Date().toISOString();return r;});
}
