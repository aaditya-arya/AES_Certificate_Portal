import standardActivity from './standard-activity.json' with {type:'json'};
export const stages = ['Pre-Inspection Meeting', 'In-Process Inspection', 'Final Inspection', 'Pre-Shipment Inspection'];
export const sections = ['Report details', 'Equipment & documents', 'Inspection activities', 'Findings & calibration', 'Photographs', 'Expenditure & sign-off', 'Review & export'];

export function filterReports(reports, {search='',searchBy='all',stage='',status='all',accreditation='',dateFrom='',dateTo=''}={}) {
  const words=search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return reports.filter(report=>{
    if(status!=='all'&&report.status!==status)return false;
    if(stage&&!(report.stages||[]).includes(stage))return false;
    if(accreditation&&accreditationType(report)!==accreditation)return false;
    const date=parseDateToIso(report.inspectionDate);
    if(dateFrom&&(!date||date<dateFrom))return false;
    if(dateTo&&(!date||date>dateTo))return false;
    const value=searchBy==='all'?searchableFields(report).map(f=>f.value).join(' '):searchBy==='location'?location(report,true):searchBy==='equipment'?(report.equipment||[]).map(row=>row.description).join(' '):String(report[searchBy]??'');
    return words.every(word=>value.toLocaleLowerCase().includes(word));
  });
}
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function parseDateToIso(value) {
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const typed = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!iso && !typed) return '';
  const [year,month,day] = iso ? [+iso[1],+iso[2],+iso[3]] : [+typed[3],+typed[2],+typed[1]];
  if (year < 1900 || year > 9999) return '';
  const date = new Date(Date.UTC(year,month-1,day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export const displayDate = value => {
  const iso = parseDateToIso(value);
  return iso ? iso.split('-').reverse().join('.') : String(value ?? '');
};

export function endDateDisplay(startDate, durationDays) {
  const iso = parseDateToIso(startDate);
  if (!iso) return displayDate(startDate);
  const d = Math.max(1, Number(durationDays) || 1);
  if (d <= 1) return displayDate(iso);
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return displayDate(iso);
  dt.setUTCDate(dt.getUTCDate() + d - 1);
  return displayDate(dt.toISOString().slice(0, 10));
}

export function accreditationType(r) {
  const traces = (r.calibration || []).map(c => String(c.traceability || '').trim()).filter(Boolean);
  if (traces.some(t => /NABL/i.test(t) && !/Non-NABL/i.test(t))) return 'NABL';
  if (traces.some(t => /NPL/i.test(t))) return 'NPL';
  if (traces.length) return traces[0];
  return '';
}

export const isCapsText = value => {
  const s = String(value ?? '').trim();
  return s.length > 0 && /[A-Z]/.test(s) && s === s.toUpperCase();
};

export const uid = () => crypto.randomUUID();

export const defaultActivityDetails = standardActivity.map(p=>`${p.bullet?'➢ ':''}${p.text}`).join('\n');

export const defaultConclusion = 'Based on inspection activities details mentioned in this inspection report, offered transformer stage is found satisfactory for the stage (core coil assembly after ovening and tanking) inspection as per QAP scope of inspection.';
export const defaultPending = 'All rest QAP S. No. expect above mentioned S. No.';
export const defaultIdentification = 'NIL';
export const defaultNonconformities = 'NIL';
export const defaultEnclosures = 'Witness Inspection report- 3 pages (Dimension and Drying process verification and insulation resistance).\nCalibration certificate.';

export const columns = {
  equipment: [
    ['itemNo', 'PO item no.', 'text', 'e.g. 1'],
    ['description', 'Item description', 'textarea', 'e.g. 100/125MVA, 220kV/34.5kV, Transformer\nStage Inspection: Core Coil assembly (After Ovening And Tanking)\nBBL Job no.6393/01'],
    ['poQty', 'PO qty. (UOM)', 'text', 'e.g. 02 Nos.'],
    ['offeredQty', 'Offered qty. (UOM)', 'text', 'e.g. 01 No.'],
    ['inspectedQty', 'Inspected qty. (UOM)', 'text', 'e.g. 01 No.']
  ],
  documents: [
    ['description', 'Document description', 'text', 'e.g. Schedule of Tests'],
    ['number', 'Document number', 'text', 'e.g. TAT-01/T/6393/4'],
    ['revision', 'Revision', 'text', 'e.g. 02'],
    ['date', 'Date', 'date', 'DD.MM.YYYY'],
    ['status', 'Approval status', 'text', 'e.g. Approved']
  ],
  activities: [
    ['clause', 'ITP/QAP clause', 'text', 'e.g. 4.1'],
    ['description', 'Activity description', 'textarea', 'e.g. Electrical clearance, mm'],
    ['quantum', 'Quantum of check', 'text', 'e.g. 100%'],
    ['scope', 'Scope', 'scope', 'Select']
  ],
  calibration: [
    ['instrument', 'Details of instrument', 'text', 'e.g. Measuring tape - 0-5000mm'],
    ['identity', 'Make / Model / ID / Sr. no.', 'text', 'e.g. Freemans/-/MT-11/-'],
    ['date', 'Calibration date', 'date', 'DD.MM.YYYY'],
    ['due', 'Due date', 'date', 'DD.MM.YYYY'],
    ['traceability', 'Traceability to NABL/NPL', 'text', 'e.g. NABL']
  ],
  expenses: [
    ['date', 'Date', 'date', 'DD.MM.YYYY'],
    ['entry', 'Entry time', 'time', '09:30'],
    ['exit', 'Exit time', 'time', '17:03'],
    ['travel', 'Traveling time', 'text', 'e.g. 01 Hr.'],
    ['km', 'Total KM (RT)', 'number', 'e.g. 12']
  ],
  persons: [
    ['name', 'Person name', 'text', 'e.g. Mr. Sudhakar Joshi'],
    ['organization', 'On behalf of (organization)', 'text', 'e.g. Akshar Engineering Services Pvt. Ltd.']
  ],
};

export function blankRow(type) {
  const r = {id: uid()};
  for (const [key] of columns[type]) r[key] = '';
  return r;
}

export function newReport() {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    completedSteps: [],
    activityDetailsMode: 'template',
    reportNo: '',
    revision: '00',
    reportDate: today(),
    client: '',
    project: '',
    vendorPO: '',
    vendorPODate: '',
    notification: '',
    notificationDate: '',
    manufacturer: '',
    aesPO: '',
    aesPODate: '',
    requester: '',
    requesterIsClient: true,
    locationOrganization: '',
    locationIsManufacturer: true,
    area: '',
    city: '',
    state: '',
    postalCode: '',
    street: '',
    inspectionDate: '',
    duration: '1',
    stages: [],
    persons: [blankRow('persons')],
    equipment: [blankRow('equipment')],
    documents: [blankRow('documents')],
    standards: '',
    activityGroupCode: 'B',
    activityGroup: 'IN-PROCESS',
    activitySubgroupCode: '4',
    activitySubgroup: 'TANKING',
    activities: [blankRow('activities')],
    activityDetails: defaultActivityDetails,
    calibration: [blankRow('calibration')],
    conclusion: defaultConclusion,
    pending: defaultPending,
    identification: defaultIdentification,
    nonconformities: defaultNonconformities,
    enclosures: defaultEnclosures,
    photos: [],
    expenses: [blankRow('expenses')],
    inspector: '',
    inspectorDate: '',
    reviewer: '',
    reviewerDate: '',
    inspectorSignature: '',
    reviewerSignature: ''
  };
}

export function requester(r) {
  return r.requesterIsClient ? r.client : r.requester;
}

export function locationOrganization(r) {
  return r.locationIsManufacturer ? r.manufacturer : r.locationOrganization;
}

export function location(r, full = false) {
  return [locationOrganization(r), full ? r.street : '', r.area, full ? r.city : '', r.state, full ? r.postalCode : ''].filter(Boolean).join(', ');
}

export function narrative(r) {
  return `As requested by ${requester(r) || '[inspection requester]'} inspection carried out at ${location(r) || '[inspection location up to state]'} On ${displayDate(r.inspectionDate) || '[inspection date]'} and scope of services as described below.`;
}

export function po(value, date) {
  return [value, date ? `Dated: ${displayDate(date)}` : ''].filter(Boolean).join('; ');
}

export function generalRows(r) {
  return [
    ['Client Name:', r.client],
    ['Project Name:', r.project],
    ['P.O. Number\n(Client to Vendor):', po(r.vendorPO, r.vendorPODate)],
    ['Inspection Notification No.:', po(r.notification, r.notificationDate)],
    ['Manufacturer/Supplier:', r.manufacturer],
    ['PO Number (Client to AES):', po(r.aesPO, r.aesPODate)],
    ['Place of Inspection:', location(r, true)],
    ['Inspection Requested By:', requester(r)],
    ['Date of Inspection:', `${displayDate(r.inspectionDate)}${r.inspectionDate && r.duration ? ` (${r.duration} ${Number(r.duration) === 1 ? 'Day' : 'Days'}).` : ''}`],
    ['Person Present:', r.persons.map(p => [p.name, p.organization ? `OBO ${p.organization}` : ''].filter(Boolean).join(' ')).filter(Boolean).join('\n')]
  ];
}

export const calibrationRemark = 'Remark: If Instrument calibrated from Non-NABL or do not have traceability of NABL / other calibration bodies, then the scope of review is limited to technical content in the calibration certificate.';

export function issues(r) {
  const result = [];
  const require = (v, msg, section) => {
    if (!String(v || '').trim()) result.push({message: msg, section});
  };
  require(r.reportNo, 'Enter the inspection visit report number.', 0);
  require(r.reportDate, 'Enter the report date.', 0);
  require(r.revision, 'Enter the revision.', 0);
  require(r.client, 'Enter the client name.', 0);
  require(r.project, 'Enter the project name.', 0);
  require(r.manufacturer, 'Enter the manufacturer / supplier.', 0);
  require(requester(r), 'Enter the inspection requester.', 0);
  require(r.inspectionDate, 'Enter the inspection date.', 0);
  require(locationOrganization(r), 'Enter the inspection organization.', 0);
  require(r.state, 'Enter the state of inspection.', 0);
  if (!r.stages.length) result.push({message: 'Select at least one inspection stage.', section: 0});
  if (!r.equipment.some(x => x.description.trim())) result.push({message: 'Describe at least one inspected item.', section: 1});
  require(activityDetailsText(r), 'Enter details of the activities carried out.', 2);
  require(r.conclusion, 'Add the inspection conclusion.', 3);
  require(r.inspector, 'Enter the inspector’s name.', 5);
  require(r.inspectorDate, 'Enter the inspector sign-off date.', 5);
  require(r.reviewer, 'Enter the reviewer’s name.', 5);
  require(r.reviewerDate, 'Enter the reviewer sign-off date.', 5);
  for (const [i, p] of r.photos.entries()) {
    if (!p.caption.trim()) result.push({message: `Add a description for photograph ${i + 1}.`, section: 4});
  }
  for (const [i, row] of r.calibration.entries()) {
    const d1 = parseDateToIso(row.date) || row.date;
    const d2 = parseDateToIso(row.due) || row.due;
    if (d1 && d2 && d2 < d1) result.push({message: `Instrument ${i + 1}: due date precedes calibration date.`, section: 3});
  }
  for (const [i, row] of r.expenses.entries()) {
    if (row.entry && row.exit && row.exit < row.entry) {
      result.push({message: `Expenditure row ${i + 1}: exit is earlier than entry. Use separate dated rows for overnight visits.`, section: 5});
    }
  }
  for (const field of searchableFields(r)) {
    if (field.type === 'date' && field.value && !parseDateToIso(field.value)) {
      result.push({message:`${field.label}: enter a valid date.`,section:field.section,path:field.path});
    }
  }
  if (!Number.isInteger(Number(r.duration)) || Number(r.duration) < 1) result.push({message:'Inspection duration must be a whole number of days, starting at 1.',section:0,path:'duration'});
  return result;
}

export function stepDone(r, idx) {
  if (!r?.completedSteps?.includes(idx)) return false;
  return idx === 6 ? issues(r).length === 0 && r.status === 'ready' : !issues(r).some(x=>x.section===idx);
}

export function progress(r) {
  return Math.round(sections.filter((_,i)=>stepDone(r,i)).length / sections.length * 100);
}

export function timeText(t) {
  if (!t) return '';
  if (/[AP]M/i.test(t)) return t;
  const [h, m] = t.split(':');
  if (h === undefined || m === undefined) return t;
  return `${String(+h % 12 || 12).padStart(2, '0')}:${m} ${+h >= 12 ? 'PM' : 'AM'}`;
}

export async function loadExample() {
  const res = await fetch('/example/tables.json');
  if (!res.ok) throw Error('Could not load reference example.');
  const t = await res.json();
  const r = newReport();
  const date = s => {
    const m = s.match(/(\d{2})[.-](\d{2})[.-](\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  };
  Object.assign(r, {
    reportNo: 'AESPL/IACL/BEPL/IR/AS/2611/0701',
    reportDate: '2026-11-07',
    client: t[0][0][1],
    project: t[0][1][1],
    vendorPO: 'PO/JFD/CP/ELE/10',
    vendorPODate: '2026-05-23',
    notification: 'As per Email',
    notificationDate: '2026-11-03',
    manufacturer: t[0][4][1],
    aesPO: '1014000087',
    aesPODate: '2026-09-16',
    area: 'Airoli',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    postalCode: '400708',
    inspectionDate: '2026-11-07',
    stages: ['Final Inspection'],
    persons: [
      {id: uid(), name: 'Mr. Sudhakar Joshi', organization: 'Akshar Engineering Services Pvt. Ltd.'},
      {id: uid(), name: 'Mr. Sharad Potdar', organization: 'Bharat Bijlee Limited.'}
    ],
    activityGroupCode: 'B',
    activityGroup: 'IN-PROCESS',
    activitySubgroupCode: '4',
    activitySubgroup: 'TANKING',
    activityDetails: defaultActivityDetails,
    conclusion: t[7][0][0].replace(/^Conclusion:\s*/, ''),
    pending: t[8][0][0].replace(/^Pending Activities:\s*/, ''),
    identification: 'NIL',
    nonconformities: 'NIL',
    enclosures: t[11][0][0].replace(/^Enclosure:\s*/, ''),
    inspector: 'Sudhakar Joshi',
    reviewer: 'Hitesh Prajapati',
    inspectorDate: '2026-11-07',
    reviewerDate: '2026-11-07'
  });
  for (const [key, ix, start, end] of [['equipment', 2, 1], ['documents', 3, 2], ['activities', 4, 3], ['calibration', 6, 1, 3]]) {
    r[key] = t[ix].slice(start, end).map(row => Object.fromEntries([
      ['id', uid()],
      ...columns[key].map(([k, , format], i) => [k, format === 'date' ? date(row[i]) : row[i]])
    ]));
  }
  r.expenses = [{id: uid(), date: '2026-11-07', entry: '09:30', exit: '17:03', travel: '01 Hr.', km: '12'}];
  r.photos = await Promise.all(Array.from({length: 8}, async (_, i) => {
    const b = await (await fetch(`/example/photo-${i + 1}.jpeg`)).blob();
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(b);
    });
    return {id: uid(), data, caption: t[12][Math.floor(i / 2) * 2 + 1][i % 2], name: `reference-${i + 1}.jpeg`};
  }));
  return r;
}

// Imports accept report data only; imported completion state must be rechecked.
export function validateImport(data) {
  const list = data?.format === 'aes-report-backup-v1' ? data.reports : null;
  if (!Array.isArray(list) || !list.length || list.length > 200) {
    throw Error('Choose a valid AES report backup (maximum 200 reports).');
  }
  return list.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid report in backup.');
    const seed = newReport();
    const r = {...seed};
    for (const key of Object.keys(seed)) {
      if (key === 'completedSteps') { r.completedSteps = []; continue; }
      if (Array.isArray(seed[key])) {
        if (!Array.isArray(raw[key]) || raw[key].length > 1000) throw Error(`Invalid ${key} in backup.`);
        if (key === 'stages') {
          r.stages = raw.stages.filter(v => stages.includes(v));
          continue;
        }
        r[key] = raw[key].map(row => {
          if (!row || typeof row !== 'object') throw Error(`Invalid ${key} row.`);
          const clean = {id: uid()};
          for (const k of key === 'photos' ? ['data', 'caption', 'name'] : columns[key].map(c => c[0])) {
            if (typeof row[k] !== 'string' || row[k].length > 20_000_000) throw Error(`Invalid ${key} value.`);
            clean[k] = row[k];
          }
          if (key === 'photos' && !/^data:image\/(png|jpeg);base64,/.test(clean.data)) throw Error('Unsupported image in backup.');
          return clean;
        });
        if (!r[key].length && key !== 'photos') r[key] = [blankRow(key)];
      } else if (typeof seed[key] === 'string' && typeof raw[key] === 'string') {
        r[key] = raw[key].slice(0, 100000);
      } else if (typeof seed[key] === 'boolean' && typeof raw[key] === 'boolean') {
        r[key] = raw[key];
      }
    }
    for (const key of ['inspectorSignature', 'reviewerSignature']) {
      if (r[key] && !/^data:image\/(png|jpeg);base64,/.test(r[key])) throw Error('Unsupported signature in backup.');
    }
    r.activityDetailsMode = raw.activityDetailsMode === 'template' ? 'template' : (raw.activityDetailsMode === 'custom' || raw.activityDetails !== defaultActivityDetails ? 'custom' : 'template');
    r.id = uid();
    r.status = 'draft';
    r.updatedAt = new Date().toISOString();
    return r;
  });
}


export const fieldCatalog = [
  [0,'reportNo','Inspection visit report number','Report header reference'],
  [0,'revision','Revision','Report header revision'],[0,'reportDate','Report date','Header issue date','date'],
  [0,'client','Client name','Organization commissioning the project'],[0,'project','Project name','Plant or substation title'],
  [0,'vendorPO','PO number · client to vendor','Client purchase order issued to manufacturer'],[0,'vendorPODate','PO date · client to vendor','Purchase order date','date'],
  [0,'notification','Inspection notification reference','Email or inspection call reference'],[0,'notificationDate','Notification date','Inspection call date','date'],
  [0,'manufacturer','Manufacturer / supplier','Vendor or factory organization'],[0,'aesPO','PO number · client to AES','Client order issued to Akshar Engineering Services'],[0,'aesPODate','PO date · client to AES','AES order date','date'],
  [0,'locationOrganization','Inspection organization','Factory where inspection takes place'],[0,'street','Street / address','Optional plot road sector building'],
  [0,'area','Area / locality','Industrial area included in the opening paragraph'],[0,'city','City / district','Full place of inspection'],[0,'state','State','State of inspection'],[0,'postalCode','PIN code','Postal code of factory'],
  [0,'requester','Inspection requested by','Defaults to the client'],[0,'inspectionDate','Date of inspection','Visit date','date'],[0,'duration','Duration (days)','Number of inspection days'],[0,'stages','1.0 Stage of inspection','Pre-inspection meeting in-process final pre-shipment'],
  [1,'standards','3.0 Reference standards','IS IEC codes applicable to the inspected equipment'],
  [2,'activityGroupCode','4.0 Group clause','Main QAP clause, e.g. B'],[2,'activityGroup','Group heading','Main inspection heading, e.g. IN-PROCESS'],
  [2,'activitySubgroupCode','Subgroup clause','Sub-clause, e.g. 4'],[2,'activitySubgroup','Subgroup heading','e.g. TANKING'],
  [2,'activityDetails','5.0 Details of activities carried out','Standard text from the original report'],
  [3,'conclusion','Conclusion','Inspection outcome'],[3,'pending','Pending activities','Work remaining or NIL'],[3,'identification','Identification of inspected items','Serial numbers markings identification or NIL'],
  [3,'nonconformities','Non-conformities / discrepancies','Inspection discrepancies or NIL'],[3,'enclosures','Enclosures','Supporting reports and calibration certificates'],
  [5,'inspector','Inspector name','Inspected by sign-off'],[5,'inspectorDate','Inspector sign-off date','Date signed by inspector','date'],[5,'inspectorSignature','Inspector signature','Upload signature image'],
  [5,'reviewer','Reviewer name','Reviewed by sign-off'],[5,'reviewerDate','Reviewer sign-off date','Date signed by reviewer','date'],[5,'reviewerSignature','Reviewer signature','Upload signature image']
];
const tableSections = {persons:0,equipment:1,documents:1,activities:2,calibration:3,expenses:5};
const tableTitles = {persons:'People present',equipment:'2.0 Equipment',documents:'3.0 Reference documents',activities:'4.0 Inspection activities',calibration:'6.0 Calibration',expenses:'8.0 Expenditure'};
export function searchableFields(r) {
  const fields = fieldCatalog.map(([section,path,label,help,type])=>({section,path,label,help,type,value:path.endsWith('Signature')?(r[path]?'Signature image uploaded':''):path==='activityDetails'?activityDetailsText(r):path==='locationOrganization'?locationOrganization(r):path==='requester'?requester(r):Array.isArray(r[path])?r[path].join(', '):String(r[path]||'')}));
  for (const [type,section] of Object.entries(tableSections)) for (const [i,row] of (r[type]||[]).entries()) {
    for (const [key,label,format,help] of columns[type]) fields.push({section,path:`${type}.${row.id}.${key}`,label:`${tableTitles[type]} · ${label} · row ${i+1}`,help:help||'',type:format,value:String(row[key]||'')});
  }
  fields.push({section:4,path:'photos',label:'7.0 Inspection photographs',help:'Upload photos images captions descriptions',value:''});
  for (const [i,photo] of r.photos.entries()) fields.push({section:4,path:`photos.${photo.id}.caption`,label:`Photograph ${i+1} description`,help:photo.name,value:photo.caption});
  return fields;
}
export function searchReportFields(r, query) {
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if(!words.length)return [];
  return searchableFields(r).filter(f=>words.every(word=>`${f.label} ${f.help} ${f.value}`.toLocaleLowerCase().includes(word)));
}
export function sectionForField(key) {
  return tableSections[key] ?? fieldCatalog.find(f=>f[1]===key)?.[0] ?? (key==='photos'?4:2);
}
export function activityDetailsText(r) {
  return r.activityDetailsMode==='template' ? defaultActivityDetails : r.activityDetails || '';
}
export function hydrateReport(raw) {
  const base = newReport();
  const report={...base,...raw,
    completedSteps:Array.isArray(raw.completedSteps)?raw.completedSteps.filter(x=>Number.isInteger(x)&&x>=0&&x<=6):raw.status==='ready'?[0,1,2,3,4,5,6]:[],
    activityDetailsMode:raw.activityDetailsMode || (raw.activityDetails===defaultActivityDetails?'template':'custom')};
  const pending=issues(report);
  if(report.status==='ready'&&pending.length){report.status='draft';report.completedSteps=report.completedSteps.filter(index=>index!==6&&!pending.some(issue=>issue.section===index));}
  return report;
}
