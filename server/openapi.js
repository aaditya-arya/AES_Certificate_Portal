import {newReport,columns,stages} from '../src/model.js';
export function getOpenapi(){
const reportProperties=Object.fromEntries(Object.entries(newReport()).map(([key,value])=>[key,Array.isArray(value)?{type:'array',items:key==='stages'?{type:'string',enum:stages}:{type:'object',properties:Object.fromEntries((key==='photos'?['id','data','caption','name']:['id',...columns[key]?.map(item=>item[0])||[]]).map(name=>[name,{type:'string'}]))}}:{type:typeof value}]));
reportProperties.completedSteps={type:'array',items:{type:'integer'}};
const response={description:'JSON response; individual reports include an ETag version.'},body={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Report'}}}};
const version={name:'If-Match',in:'header',required:true,schema:{type:'string'},description:'The quoted version returned in ETag, for example "2". Stale versions return 409.'};
return {openapi:'3.1.0',info:{title:'AES Inspection Portal API',version:'1.0.0',description:'Standard report CRUD and JSON export. Reports contain all form fields and repeatable row arrays. Photos and signatures use image data URLs in detail/export responses. /integration routes mirror these routes and require a Bearer API key.'},servers:[{url:'/api/v1'}],components:{schemas:{Report:{type:'object',additionalProperties:false,properties:reportProperties}},securitySchemes:{ApiKey:{type:'http',scheme:'bearer'}}},paths:{
 '/health':{get:{summary:'Database health',responses:{200:response}}},'/dashboard':{get:{summary:'Completed, draft and remaining report counts',responses:{200:response}}},
 '/reports':{get:{summary:'Search and paginate report summaries',parameters:['q','searchBy','workflow','status','stage','accreditation','dateFrom','dateTo','limit','offset'].map(name=>({name,in:'query',schema:{type:'string'}})),responses:{200:response}},post:{summary:'Create a report',requestBody:body,responses:{201:response,409:{description:'ID already exists'},422:{description:'Invalid report'}}}},
 '/reports/{id}':{parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],get:{summary:'Read the complete editable report, including images',responses:{200:response}},put:{summary:'Replace a report with optimistic concurrency protection',parameters:[version],requestBody:body,responses:{200:response,409:{description:'Report changed elsewhere'},428:{description:'If-Match missing'}}},delete:{summary:'Delete a report',parameters:[version],responses:{204:{description:'Deleted'},409:{description:'Report changed elsewhere'}}}},
 '/reports/{id}/export':{get:{summary:'Export the complete versioned report as JSON for another app',parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],responses:{200:response}}},
 '/changes':{get:{summary:'Incremental created, updated and deleted events',parameters:['after','limit'].map(name=>({name,in:'query',schema:{type:'integer'}})),responses:{200:response}}}
}};

}
