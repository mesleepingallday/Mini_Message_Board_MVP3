const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function runNode(source,dbFile){const p=spawnSync(process.execPath,['-e',source],{cwd:root,env:{...process.env,DB_FILE:dbFile},encoding:'utf8'});assert.equal(p.status,0,p.stderr);return p.stdout;}
test('migration preserves MVP2 ids, content, timestamps and creates backup',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mvp3-migrate-'));const file=path.join(dir,'messages.db');
 runNode(`const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_FILE);d.exec("CREATE TABLE messages(id INTEGER PRIMARY KEY AUTOINCREMENT,content TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO messages(id,content,created_at) VALUES(7,'Tin MVP 2','2024-01-01 09:00:00')");d.close()`,file);
 const out=runNode(`const s=require('./db');console.log(JSON.stringify(s.get(7)));console.log(s.one('PRAGMA foreign_key_check')?'fk_problem':'fk_ok');s.close()`,file);
 assert.match(out,/"id":7/);assert.match(out,/Tin MVP 2/);assert.match(out,/2024-01-01 09:00:00/);assert.match(out,/fk_ok/);assert.ok(fs.existsSync(file+'.before-mvp3.bak'));
 const again=runNode(`const s=require('./db');console.log(s.one('SELECT COUNT(*) AS n FROM messages').n);s.close()`,file);assert.match(again,/1/);
 fs.rmSync(dir,{recursive:true,force:true});
});
test('CRUD, FK, JOIN, LIKE escaping, pagination, stats, reaction UPSERT & CASCADE',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mvp3-db-')),file=path.join(dir,'test.db');
 const out=runNode(`const s=require('./db');const a=s.create('100% học tập',2,2);const b=s.create('Tin mới',2,1);if(s.list({q:'100%'}).pagination.total!==1)throw Error('search');if(s.list({page:1,limit:1}).data.length!==1)throw Error('page');if(s.get(a.id).author!=='Sinh viên Demo')throw Error('join');if(!s.update(a.id,'Đã sửa',2))throw Error('update');const r=s.react(a.id,2,'like');const r2=s.react(a.id,2,'love');if(r.id!==r2.id)throw Error('upsert');if(s.one('SELECT COUNT(*) AS n FROM message_reactions').n!==1)throw Error('duplicate');if(!s.remove(a.id))throw Error('delete');if(s.one('SELECT COUNT(*) AS n FROM message_reactions').n!==0)throw Error('cascade');if(!s.stats().some(x=>x.message_count===1))throw Error('stats');let rejected=false;try{s.create('x',999,1)}catch(e){rejected=true}if(!rejected)throw Error('fk');console.log('PASS ALL');s.close()`,file);
 assert.match(out,/PASS ALL/);fs.rmSync(dir,{recursive:true,force:true});
});
