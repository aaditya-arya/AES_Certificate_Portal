import {parseDateToIso} from './model.js';

export function suggestedCode(name,person=false){
 const words=String(name||'').replace(/\bM\s*\/\s*s\.?/gi,'').replace(/^(mr|mrs|ms|dr)\.?\s+/i,'').match(/[A-Za-z0-9]+/g)||[];
 return words.slice(0,person?3:12).map(word=>word[0]).join('').toUpperCase();
}
export function numberingCodes(report){return {clientCode:(report.clientCode||suggestedCode(report.client)).toUpperCase(),manufacturerCode:(report.manufacturerCode||suggestedCode(report.manufacturer)).toUpperCase(),inspectorCode:(report.inspectorCode||suggestedCode(report.inspector,true)).toUpperCase()};}
export function reportNumberBase(report){
 const date=parseDateToIso(report.inspectionDate),codes=numberingCodes(report);
 if(!date||Object.values(codes).some(value=>!value||!/^[A-Z0-9]{1,12}$/.test(value)))return '';
 return `AESPL/${codes.clientCode}/${codes.manufacturerCode}/IR/${codes.inspectorCode}/${date.slice(2,4)}${date.slice(5,7)}/${date.slice(8,10)}`;
}
export function documentNumberBase(reportNo,type){
 const prefix={flash:'FR',irc:'IRC',punch:'PL',ncr:'NCR'}[type];if(!prefix||!String(reportNo||'').trim())return '';
 return `${reportNo.includes('/IR/')?reportNo.replace('/IR/',`/${prefix}/`):`${reportNo}/${prefix}`}/`;
}
export function numberPreview(report){const base=reportNumberBase(report);return base?`${base}${report.visitSequence||'NN'}`:'AESPL / client / vendor / IR / inspector / YYMM / DD + sequence';}
