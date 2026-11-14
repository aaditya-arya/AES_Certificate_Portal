import {fail} from './validation.js';
export const reportSlug=number=>number.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180)||'INSPECTION';
export async function ensureReportLink(db,id,number){
 if(!number?.trim())return null;
 const previous=await db.get('SELECT slug FROM report_links WHERE report_id=? AND report_no=? ORDER BY created_at,slug LIMIT 1',[id,number]);
 let slug=previous?.slug;
 if(!slug){
  const base=reportSlug(number);slug=base;
  for(let attempt=0;attempt<3;attempt++){
   await db.batch([{sql:'INSERT INTO report_links(slug,report_id,report_no,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM reports WHERE id=?) ON CONFLICT(slug) DO NOTHING',params:[slug,id,number,new Date().toISOString(),id]}]);
   const owner=await db.get('SELECT report_id FROM report_links WHERE slug=?',[slug]);if(!owner)fail(409,'REPORT_CHANGED','The report was deleted while its link was being created.');if(owner.report_id===id)break;
   slug=`${base}-${attempt===0?id:crypto.randomUUID()}`;
   if(attempt===2)fail(409,'LINK_CONFLICT','Could not reserve a report link. Retry.');
  }
 }
 return {slug,path:`/reports/${slug}`,reportNo:number};
}
export function absoluteReportLink(link,requestUrl){return link?{...link,url:new URL(link.path,requestUrl).href}:null;}
