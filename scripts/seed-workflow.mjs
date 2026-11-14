import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {jsPDF} from 'jspdf';
import {expect} from '@playwright/test';
import {openDatabase} from '../server/sqlite.js';
import {handleApi} from '../server/api.js';
import {startServer} from '../server/index.js';
import {fullReport,assignment,fullDocument,documentPayload} from '../tests/workflow-fixtures.mjs';
import {resourceGroups} from '../src/dossier-model.js';
import {launchBrowser} from '../tests/browser-engine.mjs';
// Explicitly creates visible TEST ONLY records in the local database; never calls the Samsung portal.
const filename=process.env.DATABASE_PATH||'data/aes-portal.sqlite',db=openDatabase(filename),manifest={fixtureVersion:2,createdAt:new Date().toISOString(),database:db.filename,scenarios:[]};
async function call(method,path,body,version){const r=await handleApi(new Request(`http://localhost/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(version?{'If-Match':`"${version}"`}:{})},...(body?{body:JSON.stringify(body)}:{})}),db);const json=await r.json();if(!r.ok)throw Error(`${method} ${path}: ${JSON.stringify(json)}`);return json.data;}
try{
 try{const existing=JSON.parse(await readFile('data/workflow-test-manifest.json','utf8'));if(existing.database===db.filename&&existing.scenarios.length===3&&(await db.get('SELECT id FROM reports WHERE id=?',[existing.scenarios[2].reportId]))){console.log('Existing workflow scenarios retained. See data/workflow-test-manifest.json.');process.exitCode=0;db.close();process.exit(0);}}catch{}
 for(const scenario of ['DRAFT-COMPLETE','OPEN-ACTIONS','CLOSED-RELEASED']){
  const report=await fullReport(scenario);report.project+=` ${report.id.slice(0,8)}`;if(scenario==='DRAFT-COMPLETE')report.status='draft';const saved=await call('POST','/reports',report),path=`/reports/${report.id}/dossier`;let dossier=await call('GET',path);dossier=await call('PUT',path,{...assignment(),assignmentNo:`TEST-${scenario}-${report.id.slice(0,8)}`,state:scenario==='CLOSED-RELEASED'?'completed':'assigned'},dossier.version);
  for(const [category,label]of Object.entries(resourceGroups)){const pdf=new jsPDF();pdf.setFontSize(20);pdf.text('SAMPLE / TEST ONLY',20,25);pdf.setFontSize(12);pdf.text([label,`Scenario: ${scenario}`,`Inspection: ${saved.reportNo}`,`Document: TEST-${category}, revision 02, approval A`,'This is synthetic workflow evidence. Do not use for real inspection.'],20,45);dossier=await call('POST',path+'/files',{category,name:`TEST-${category}.pdf`,description:`TEST ONLY ${label} for ${scenario}`,documentNo:`TEST-${category}`,revision:'02',approvalCode:'A',itemTag:'TEST-TAG-001',data:'data:application/pdf;base64,'+Buffer.from(pdf.output('arraybuffer')).toString('base64')},dossier.version);}
  const documents=[];for(const type of ['flash','punch','ncr','irc']){const input=fullDocument(type,report);if(type==='irc'&&scenario==='CLOSED-RELEASED'){input.releaseDecision='Released';input.releaseRemarks='TEST: quality actions verified closed.';}let d=await call('POST','/documents',input);if(scenario!=='DRAFT-COMPLETE')d=await call('POST',`/documents/${d.id}/transitions`,{action:'issue'},d.version);
   if(scenario==='CLOSED-RELEASED'&&['punch','ncr'].includes(type)){d.closedDate='2026-11-14';d.items.forEach(item=>{item.status='closed';item.resolution='TEST: correction independently verified; evidence retained.';});d=await call('PUT',`/documents/${d.id}`,documentPayload(d),d.version);d=await call('POST',`/documents/${d.id}/transitions`,{action:'request-close'},d.version);d=await call('POST',`/documents/${d.id}/transitions`,{action:'close'},d.version);}documents.push({id:d.id,type,status:d.status,number:d.number});}
  manifest.scenarios.push({name:scenario,reportId:report.id,reportNo:saved.reportNo,reportStatus:report.status,resources:dossier.files.length,documents});console.log(`Created ${scenario}: ${saved.reportNo}`);
 }
}finally{db.close();}
// Issue the completed scenario through real UI generation so the retained artifact is the actual AES PDF.
const running=startServer({port:0,database:filename});await once(running.server,'listening');const browser=await launchBrowser();
try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),target=manifest.scenarios[2];await page.goto(`http://127.0.0.1:${running.server.address().port}`);await page.locator('#report-search').fill(target.reportNo);const row=page.locator('tbody tr').filter({hasText:target.reportNo});await expect(row).toHaveCount(1);await row.getByRole('button',{name:'Inspection details',exact:true}).click();await page.getByRole('button',{name:'Issue IR',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Issue IR',exact:true}).click();await expect(page.getByRole('link',{name:'Issued PDF',exact:true})).toBeVisible({timeout:30000});target.irIssued=true;}finally{await browser.close();await running.close();await mkdir('data',{recursive:true});await writeFile('data/workflow-test-manifest.json',JSON.stringify(manifest,null,2)+'\n');}
console.log('Three fully populated TEST ONLY scenarios are stored in the local portal. Manifest: data/workflow-test-manifest.json');
