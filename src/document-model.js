import {today,parseDateToIso} from './model.js';

export const documentTypes={
 flash:{name:'Flash reports',title:'Flash report',prefix:'FR',description:'Visit results, inspected items and immediate action points.',fields:[['summary','Summary of inspection','textarea'],['nonconformance','Non-conformance description','textarea'],['outstanding','Outstanding actions','textarea'],['actionBy','Action by','select',['None','AES','Client','Vendor']],['referenceDocuments','Reference documents','textarea']]},
 irc:{name:'Release certificates',title:'Inspection release certificate',prefix:'IRC',description:'Release decisions and conditions for inspected equipment.',fields:[['releaseDecision','Release decision','select',['Released','Released with conditions','Not released']],['certificateScope','Scope of release','textarea'],['releaseRemarks','Release conditions / remarks','textarea'],['shipmentDetails','Shipment / dispatch details','textarea'],['referenceDocuments','Reference documents','textarea']]},
 punch:{name:'Punch lists',title:'Punch list',prefix:'PL',description:'Outstanding inspection items, owners, target dates and closure.',fields:[['summary','Scope / summary','textarea'],['verification','Closure verification','textarea']]},
 ncr:{name:'Non-conformities',title:'Non-conformance report',prefix:'NCR',description:'Record a non-conformity and track correction through verification.',fields:[['itemName','Item name','text'],['title','NCR title','text'],['summary','Description of non-conformity','textarea'],['referenceDocuments','Requirement / reference clause','textarea'],['cause','Root cause','textarea'],['correction','Immediate correction / containment','textarea'],['correctiveAction','Corrective action','textarea'],['verification','Verification of corrective action','textarea']]}
};
export const attachmentPurposes={'supporting':'Supporting document','photograph':'Inspection photograph','test-report':'Test report','signed-packing-list':'Signed packing list','reporter-signature':'Reporter stamp / signature','ncr-report':'NCR file','signed-punch-list':'Signed Punch list'};
export const issueTypes=['punch','ncr'];
export const statusNames={draft:'Draft',issued:'Issued',open:'Open',closure_requested:'Closure requested',closed:'Closed'};
export const itemFields=[['tag','Item / tag no.'],['description','Item description'],['quantity','Quantity'],['inspection','Kind of inspection'],['result','Result'],['priority','Priority'],['owner','Responsible person'],['dueDate','Target date'],['status','Item status'],['resolution','Resolution / evidence']];
export const newDocumentItem=()=>({id:crypto.randomUUID(),tag:'',description:'',quantity:'',inspection:'',result:'',priority:'Normal',owner:'',dueDate:'',status:'open',resolution:''});
export function newDocument(type,reportId=''){
 if(!documentTypes[type])throw Error('Unknown document type.');
 return {id:crypto.randomUUID(),type,reportId,number:'',numberingMode:'automatic',revision:'00',date:today(),status:'draft',preparedBy:'',reviewedBy:'',result:'',owner:'',targetDate:'',closedDate:'',...Object.fromEntries(documentTypes[type].fields.map(([key])=>[key,''])),items:[newDocumentItem()],attachments:[]};
}
export function documentIssues(record,closing=false){
 const messages=[];
 for(const [key,label]of [['reportId','Linked inspection'],['number','Document number'],['preparedBy','Prepared by']])if(!record[key]?.trim())messages.push(`${label} is required.`);
 if(!parseDateToIso(record.date))messages.push('Enter a valid document date.');
 if(!record.items?.length||record.items.some(item=>!item.description?.trim()))messages.push('Describe every item.');
 if(record.type==='flash'){
  if(!record.summary?.trim()||!record.result||!record.nonconformance?.trim()||!record.outstanding?.trim()||!record.actionBy)messages.push('Enter the result, summary, non-conformance description, outstanding actions and action owner (use None/NIL where applicable).');
  const photos=(record.attachments||[]).filter(file=>file.mime?.startsWith('image/'));if(photos.length<3)messages.push('Attach at least three inspection photographs before issuing a Flash report.');if(photos.some(photo=>!photo.caption?.trim()))messages.push('Describe every Flash photograph before issuing.');
 }
 if(record.type==='irc'){if(!record.result)messages.push('Select the inspection result.');if(!record.attachments?.some(f=>f.purpose==='signed-packing-list'))messages.push('Attach and identify the signed packing list.');if(!record.attachments?.some(f=>f.purpose==='reporter-signature'))messages.push('Attach and identify the reporter stamp / signature.');}
 if(record.type==='irc'&&(!record.releaseDecision||!record.certificateScope?.trim()||!record.reviewedBy?.trim()))messages.push('Enter the release decision, scope and reviewer.');
 if(record.type==='irc'&&record.releaseDecision==='Released with conditions'&&!record.releaseRemarks?.trim())messages.push('Describe the release conditions.');
 if(record.type==='ncr'&&(!record.title?.trim()||!record.itemName?.trim()))messages.push('Enter the NCR title and item name.');
 if(record.type==='ncr'&&(!record.summary?.trim()||!record.referenceDocuments?.trim()||!record.owner?.trim()))messages.push('Enter the non-conformity, requirement and responsible person.');
 if(record.type==='punch'&&!record.summary?.trim())messages.push('Enter the punch-list scope.');
 for(const item of record.items||[])if(item.dueDate&&!parseDateToIso(item.dueDate))messages.push('An item target date is invalid.');
 if(record.targetDate&&!parseDateToIso(record.targetDate))messages.push('The target date is invalid.');
 if(closing){
  if(record.type==='ncr'&&!record.attachments?.some(f=>f.purpose==='ncr-report'))messages.push('Attach and identify the NCR file before requesting closure.');
  if(!parseDateToIso(record.closedDate))messages.push('Enter the closure date.');
  if(!record.verification?.trim()||!record.reviewedBy?.trim())messages.push('Enter verification evidence and the reviewer before closing.');
  if(record.items.some(item=>item.status!=='closed'||!item.resolution?.trim()))messages.push('Close every item and describe its resolution.');
  if(record.type==='ncr'&&(!record.cause?.trim()||!record.correctiveAction?.trim()))messages.push('Enter the root cause and corrective action.');
 }
 return [...new Set(messages)];
}
