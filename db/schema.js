import {sqliteTable,text,integer,blob,index} from 'drizzle-orm/sqlite-core';

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
