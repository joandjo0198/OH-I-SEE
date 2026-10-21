'use strict';
// Never put database credentials in command-line arguments or log output.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
require('dotenv').config({path:path.resolve(__dirname, '../.env')});
const tables = ['product_bim_specs','project_material_states','project_material_versions','bim_procurement_drafts'];
async function check() {
 const db = require('../src/config/supabase');
 let ready = true;
 for (const table of tables) {
  const {error} = await db.from(table).select('*').limit(0);
  console.log(`${table}: ${error ? 'UNAVAILABLE (' + (error.code || 'connection error') + ')' : 'ready'}`);
  if (error) ready = false;
 }
 return ready;
}
async function main() {
 if (process.argv.includes('--check')) {process.exitCode = await check() ? 0 : 1; return;}
 if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in backend/.env to the project PostgreSQL connection string, then run npm run migrate:materials. Do not share it in chat.');
 let url;try {url = new URL(process.env.DATABASE_URL);} catch {throw new Error('DATABASE_URL is not a valid connection URL.');}
 if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use postgres:// or postgresql://.');
 const project = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
 if (!url.hostname.includes(project) && !decodeURIComponent(url.username).endsWith('.'+project)) throw new Error('Database connection does not match the configured Supabase project. Use its direct or pooler connection string.');
 const executable = process.env.PSQL_BIN || (process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/17/bin/psql.exe' : 'psql');
 if (process.platform === 'win32' && !fs.existsSync(executable)) throw new Error('Set PSQL_BIN to your PostgreSQL psql executable.');
 const env = {...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1))||'postgres',PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15'};
 delete env.DATABASE_URL;
 const result = spawnSync(executable,['-X','--no-password','-v','ON_ERROR_STOP=1','-f',path.resolve(__dirname,'../database/material_bim_workflow.sql')],{env,encoding:'utf8',timeout:60000,windowsHide:true});
 if (result.error || result.status !== 0) {
  // psql errors can contain connection details; return only non-secret SQLSTATE or a generic failure.
  throw new Error('Migration failed or timed out. Verify the PostgreSQL connection, password, network access and schema prerequisites in Supabase. No success has been recorded.');
 }
 console.log('Migration transaction committed. Verifying API schema availability…');
 for (let attempt=0;attempt<5;attempt++) {
  if (await check()) {console.log('All four material workflow tables are available.');return;}
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 throw new Error('Migration committed but API schema verification failed. Check Supabase schema cache and service-role access.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
