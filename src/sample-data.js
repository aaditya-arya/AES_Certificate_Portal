import {newReport,uid,today,loadExample} from './model.js';

// Realistic test values follow the same schema and date/quantity relationships as real reports.
export function randomizeSampleReport(reference,target=null,random=Math.random) {
  const integer=(low,high)=>low+Math.floor(random()*(high-low+1));
  const pick=values=>values[integer(0,values.length-1)];
  const job=String(integer(10000,99999));
  const day=today();
  const shifted=(base,days)=>{const date=new Date(`${base}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
  const counts={};
  for(const type of ['equipment','documents','activities','calibration','expenses','persons'])counts[type]=target?Math.max(1,target[type]?.length||0):integer(2,4);
  const duration=Math.max(counts.expenses,integer(1,3));
  const visit=shifted(day,-integer(duration+1,duration+45));
  const end=shifted(visit,duration-1);
  const [city,area,state,postalCode]=pick([
    ['Pune','Bhosari','Maharashtra','411026'],['Vadodara','Makarpura','Gujarat','390010'],
    ['Nashik','Ambad','Maharashtra','422010'],['Chennai','Ambattur','Tamil Nadu','600058'],
    ['Jaipur','Sitapura','Rajasthan','302022'],['Ahmedabad','Naroda','Gujarat','382330']
  ]);
  const client=`M/s. ${pick(['Pragati Copper','Surya Metals','Vardhan Steel','Satya Power'])} Industries Ltd. (Sample ${job})`;
  const manufacturer=`M/s. ${pick(['Deccan Electrical Works','Crest Power Systems','Western Transformer Works','Eastern Electromechanical'])} Ltd.`;
  const name=()=>`${pick(['Aarav','Rohan','Neha','Meera','Vikram','Ananya'])} ${pick(['Shah','Kulkarni','Rao','Patel','Mehta','Sharma'])} (Sample)`;
  const report=Object.assign(newReport(),{
    reportNo:`SAMPLE/AES/${day.replaceAll('-','')}/${job}-${uid().slice(0,6).toUpperCase()}`,
    revision:String(integer(0,3)).padStart(2,'0'),reportDate:day,client,manufacturer,
    project:`${pick(['132/33kV','220/33kV','110/11kV'])} ${pick(['COPPER PLANT','STEEL PLANT','INDUSTRIAL SUBSTATION'])} - SAMPLE ${job}`,
    vendorPO:`SAMPLE/PO/${integer(1000,9999)}/${job}`,vendorPODate:shifted(visit,-integer(45,120)),
    aesPO:`SAMPLE/AES/PO/${integer(1000,9999)}`,aesPODate:shifted(visit,-integer(15,40)),
    notification:`SAMPLE/ICN/${job}/${integer(1,9)}`,notificationDate:shifted(visit,-integer(1,10)),
    street:`Plot ${integer(10,99)}, ${pick(['Industrial Estate','Engineering Park','Industrial Area'])}`,
    city,area,state,postalCode,requester:client,locationOrganization:manufacturer,
    inspectionDate:visit,duration:String(duration),stages:pick([['In-Process Inspection'],['Final Inspection'],['In-Process Inspection','Final Inspection']]),
    standards:pick(['IS 2026 / IEC 60076','IEC 60076-1; IS 2026 (Part 1)']),
    inspector:name(),reviewer:name(),inspectorDate:end,reviewerDate:day,
    conclusion:`The witnessed core-coil assembly and tanking checks for sample job ${job} were found satisfactory against the approved QAP.`,
    pending:pick(['Final routine tests and dispatch clearance as per approved QAP.','Final electrical tests and review of the completed test dossier.']),
    identification:`SAMPLE JOB ${job}; serial markings verified against the equipment list.`,
    nonconformities:'NIL'
  });
  const rows=(type,make)=>Array.from({length:counts[type]},(_,index)=>({id:target?.[type]?.[index]?.id||uid(),...make(index)}));
  report.equipment=rows('equipment',index=>{
    const ordered=integer(2,8),offered=integer(1,ordered),inspected=integer(1,offered);
    const [rating,voltage]=pick([['100/125MVA','220/33kV'],['50/63MVA','132/33kV'],['20/25MVA','110/11kV'],['10/12.5MVA','66/11kV']]);
    return {itemNo:String(index+1),description:`${rating}, ${voltage}, POWER TRANSFORMER\nStage: Core coil assembly after ovening and tanking\nJob no. ${job}/${index+1}; Sr. no. SAMPLE-${integer(10000,99999)}`,poQty:`${ordered} Nos.`,offeredQty:`${offered} Nos.`,inspectedQty:`${inspected} Nos.`};
  });
  const documents=['Approved QAP','General arrangement drawing','Schedule of tests','Guaranteed technical particulars','Winding assembly drawing','Inspection procedure'];
  report.documents=rows('documents',index=>({description:documents[index%documents.length],number:`SAMPLE/${job}/DOC/${String(index+1).padStart(2,'0')}-${integer(10,99)}`,revision:String(integer(0,4)).padStart(2,'0'),date:shifted(visit,-integer(7,30)),status:pick(['Approved','Approved with comments'])}));
  const activities=['Electrical clearance verification','Core earthing verification','Lead termination checks','Insulation resistance measurement','Tanking fit-up verification','Review of drying cycle records'];
  report.activities=rows('activities',index=>({clause:`B 4.${index+1}`,description:activities[index%activities.length],quantum:pick(['100%','As per approved QAP']),scope:pick(['R','W','RW','V'])}));
  const instruments=['Digital multimeter','Insulation resistance tester','Measuring tape','Vernier caliper','Torque wrench'];
  report.calibration=rows('calibration',index=>({instrument:instruments[index%instruments.length],identity:`SAMPLE/INST/${job}/${index+1}; S.N. ${integer(1000,9999)}`,date:shifted(visit,-integer(90,270)),due:shifted(end,integer(90,365)),traceability:pick(['NABL','NPL'])}));
  report.expenses=rows('expenses',index=>({date:shifted(visit,index),entry:pick(['08:30','09:00','09:15']),exit:pick(['16:30','17:00','17:30','18:00']),travel:`${integer(1,3)} Hr. ${pick(['00','15','30','45'])} Min.`,km:String(integer(12,160))}));
  report.persons=rows('persons',index=>({name:index===0?report.inspector:name(),organization:[ 'Akshar Engineering Services Pvt. Ltd.',manufacturer,client ][index%3]}));
  const photos=target?.photos?.length?target.photos:reference.photos.map(photo=>({...photo}));
  if(!target?.photos?.length)for(let index=photos.length-1;index>0;index--){const other=integer(0,index);[photos[index],photos[other]]=[photos[other],photos[index]];}
  report.photos=photos.map((photo,index)=>({...photo,id:target?.photos?.length?photo.id:uid(),caption:`SAMPLE JOB ${job}: ${pick(['Core-coil assembly inspection','Tanking stage inspection','Equipment identification check','Workshop inspection record'])} at ${area}, ${city}. Photograph ${index+1}.`}));
  report.enclosures=`Sample inspection records for job ${job}.\n${counts.documents} reference documents and ${counts.calibration} calibration certificates.\n${report.photos.length} inspection photographs.`;
  return report;
}

export async function loadSampleReport(target=null) {
  return randomizeSampleReport(await loadExample(),target);
}
