import {sqliteTable,text,integer,blob,index,uniqueIndex} from 'drizzle-orm/sqlite-core';

export const reports=sqliteTable('reports',{
 id:text('id').primaryKey(),document:text('document').notNull(),version:integer('version').notNull(),
 mutationId:text('mutation_id').notNull(),workflow:text('workflow').notNull(),reportNo:text('report_no').notNull(),
 client:text('client').notNull(),project:text('project').notNull(),inspectionDate:text('inspection_date').notNull(),
 status:text('status').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},table=>[index('reports_updated_idx').on(table.updatedAt),index('reports_workflow_idx').on(table.workflow)]);
export const media=sqliteTable('report_media',{
 reportId:text('report_id').notNull().references(()=>reports.id,{onDelete:'cascade'}),mediaId:text('media_id').notNull(),
 mime:text('mime').notNull(),storageKey:text('storage_key'),digest:text('digest').notNull()
},table=>[index('media_report_idx').on(table.reportId)]);
export const blobs=sqliteTable('media_blobs',{digest:text('digest').primaryKey(),mime:text('mime').notNull(),bytes:blob('bytes',{mode:'buffer'}).notNull()});
export const changes=sqliteTable('report_changes',{
 sequence:integer('sequence').primaryKey({autoIncrement:true}),reportId:text('report_id').notNull(),version:integer('version').notNull(),operation:text('operation').notNull(),updatedAt:text('updated_at').notNull()
});
export const inspectionDocuments=sqliteTable('inspection_documents',{
 id:text('id').primaryKey(),reportId:text('report_id').notNull().references(()=>reports.id,{onDelete:'restrict'}),
 type:text('type').notNull(),number:text('number').notNull(),revision:text('revision').notNull(),status:text('status').notNull(),
 document:text('document').notNull(),context:text('context').notNull(),version:integer('version').notNull(),mutationId:text('mutation_id').notNull(),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},table=>[uniqueIndex('documents_number_unique').on(table.type,table.number),index('documents_report_idx').on(table.reportId),index('documents_type_status_idx').on(table.type,table.status)]);
export const documentFiles=sqliteTable('document_files',{
 id:text('id').primaryKey(),documentId:text('document_id').notNull().references(()=>inspectionDocuments.id,{onDelete:'cascade'}),
 name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),digest:text('digest').notNull(),
 bytes:blob('bytes',{mode:'buffer'}),storageKey:text('storage_key')
});
export const documentVersions=sqliteTable('document_versions',{
 id:integer('id').primaryKey({autoIncrement:true}),documentId:text('document_id').notNull().references(()=>inspectionDocuments.id,{onDelete:'cascade'}),version:integer('version').notNull(),
 document:text('document').notNull(),context:text('context').notNull(),operation:text('operation').notNull(),note:text('note').notNull(),recordedAt:text('recorded_at').notNull()
});
export const documentEvents=sqliteTable('document_events',{
 sequence:integer('sequence').primaryKey({autoIncrement:true}),documentId:text('document_id').notNull(),type:text('type').notNull(),version:integer('version').notNull(),operation:text('operation').notNull(),updatedAt:text('updated_at').notNull()
});
export const numberCounters=sqliteTable('number_counters',{scope:text('scope').primaryKey(),value:integer('value').notNull()});
export const numberAllocations=sqliteTable('number_allocations',{owner:text('owner').primaryKey(),scope:text('scope').notNull(),sequence:integer('sequence').notNull(),reference:text('reference').notNull()},table=>[uniqueIndex('number_reference_unique').on(table.reference)]);
