import {newDocument,documentTypes} from '../src/document-model.js';
export function documentOpenapi(){
 const response={description:'JSON response. Individual documents include an ETag.'};
 const version={name:'If-Match',in:'header',required:true,schema:{type:'string'},description:'Quoted current version. Stale writes return 409.'};
 const id={name:'id',in:'path',required:true,schema:{type:'string'}};
 const input={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/InspectionDocument'}}}};
 const schema={oneOf:Object.keys(documentTypes).map(type=>({type:'object',additionalProperties:false,required:['type','reportId','number','items','attachments'],properties:Object.fromEntries(Object.entries(newDocument(type)).map(([key,value])=>[key,key==='type'?{const:type}:Array.isArray(value)?{type:'array',items:{type:'object',additionalProperties:true}}:{type:'string'}]))}))};
 const paths={
  '/documents':{get:{summary:'Search linked Flash, IRC, Punch and NCR records',parameters:['type','status','q','reportId','dateFrom','dateTo','limit','offset'].map(name=>({name,in:'query',schema:{type:'string'}})),responses:{200:response}},post:{summary:'Create a draft linked to a saved inspection',requestBody:input,responses:{201:response,422:{description:'Invalid document or inspection link'}}}},
  '/documents/{id}':{parameters:[id],get:{summary:'Read document, context and attachment metadata',responses:{200:response}},put:{summary:'Save a draft or open action record',parameters:[version],requestBody:input,responses:{200:response,409:{description:'Version conflict or locked document'}}},delete:{summary:'Delete a draft and its stored files/versions',parameters:[version],responses:{204:{description:'Deleted'}}}},
  '/documents/{id}/transitions':{parameters:[id],post:{summary:'Issue, revise, cancel-issue, close or reopen a document',parameters:[version],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['action'],properties:{action:{enum:['issue','revise','cancel-issue','close','reopen']},note:{type:'string',description:'Required for cancellation and reopening.'}}}}}},responses:{200:response,422:{description:'Required fields, open quality issues or closure evidence prevent transition'}}}},
  '/documents/{id}/history':{parameters:[id],get:{summary:'Saved version and status-change history',responses:{200:response}}},
  '/documents/{id}/versions/{version}':{parameters:[id,{name:'version',in:'path',required:true,schema:{type:'integer',minimum:1}}],get:{summary:'Read an immutable saved snapshot',responses:{200:response}}},
  '/documents/{id}/files/{fileId}':{parameters:[id,{name:'fileId',in:'path',required:true,schema:{type:'string'}},{name:'version',in:'query',schema:{type:'integer',minimum:1}}],get:{summary:'Download a current or historical attachment',responses:{200:{description:'Binary file download'}}}},
  '/documents/{id}/export':{parameters:[id],get:{summary:'Export the document and base64 attachment data for integration',responses:{200:response}}},
  '/document-changes':{get:{summary:'Incremental document changes including deletion events',parameters:[{name:'after',in:'query',schema:{type:'integer',minimum:0}}],responses:{200:response}}}
 };
 return {schema,paths};
}
