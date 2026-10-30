const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const file = process.env.DB_FILE || path.join(__dirname,'data','messages.db');
fs.mkdirSync(path.dirname(file), {recursive:true});
const db = new DatabaseSync(file);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const sql = (q, ...p) => db.prepare(q).all(...p);
const one = (q, ...p) => db.prepare(q).get(...p);
const run = (q, ...p) => db.prepare(q).run(...p);
function migrate(){
 const version = Number(one('PRAGMA user_version').user_version);
 if (version >= 3) return;
 // Back up existing MVP2 DB before altering schema; sqlite backup via VACUUM INTO
 if(fs.existsSync(file) && fs.statSync(file).size && version < 3){
   const backup = file+'.before-mvp3.bak';
   if(!fs.existsSync(backup)) db.exec(`VACUUM INTO '${backup.replaceAll("'","''")}'`);
 }
 db.exec('BEGIN IMMEDIATE');
 try {
  const exists = !!one("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'");
  const columns = exists ? sql('PRAGMA table_info(messages)').map(c=>c.name) : [];
  const legacy = exists && !columns.includes('user_id');
  if(legacy) db.exec('ALTER TABLE messages RENAME TO messages_mvp2_legacy');
  db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, content TEXT NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 500), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS message_reactions (id INTEGER PRIMARY KEY, message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, reaction_type TEXT NOT NULL CHECK(reaction_type IN ('like','love','wow')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(message_id,user_id));
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_category_created ON messages(category_id,created_at DESC,id DESC);
  CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);`);
  run("INSERT OR IGNORE INTO users(id,username,display_name) VALUES (1,'legacy','Người dùng MVP 2')");
  run("INSERT OR IGNORE INTO users(id,username,display_name) VALUES (2,'student','Sinh viên Demo')");
  run("INSERT OR IGNORE INTO categories(id,name,slug) VALUES (1,'Chung','chung')");
  run("INSERT OR IGNORE INTO categories(id,name,slug) VALUES (2,'Học tập','hoc-tap')");
  if(legacy){
    db.exec(`INSERT INTO messages(id,user_id,category_id,content,created_at)
      SELECT id,1,1,content,created_at FROM messages_mvp2_legacy;
      DROP TABLE messages_mvp2_legacy;`);
  }
  db.exec('PRAGMA user_version=3; COMMIT');
 } catch(e){db.exec('ROLLBACK');throw e;}
}
migrate();
function list({q='',categoryId=null,page=1,limit=10}={}){
 const where=' WHERE (? = \'\' OR m.content LIKE ? ESCAPE \'\\\') AND (? IS NULL OR m.category_id = ?)';
 const params=[q,`%${q.replace(/[\\%_]/g, '\\$&')}%`,categoryId,categoryId];
 const total=one('SELECT COUNT(*) AS n FROM messages m'+where,...params).n;
 const rows=sql(`SELECT m.id,m.content AS message,m.user_id,m.category_id,m.created_at,m.updated_at,u.display_name AS author,c.name AS category,
 (SELECT COUNT(*) FROM message_reactions r WHERE r.message_id=m.id) AS reactions
 FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN categories c ON c.id=m.category_id`+where+' ORDER BY m.created_at DESC,m.id DESC LIMIT ? OFFSET ?',...params,limit,(page-1)*limit);
 return {data:rows, pagination:{page,limit,total,pages:Math.ceil(total/limit)}};
}
function get(id){return one(`SELECT m.id,m.content AS message,m.user_id,m.category_id,m.created_at,m.updated_at,u.display_name AS author,c.name AS category FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN categories c ON c.id=m.category_id WHERE m.id=?`,id);}
function create(content,userId,categoryId){const r=run('INSERT INTO messages(content,user_id,category_id) VALUES (?,?,?)',content,userId,categoryId);return get(Number(r.lastInsertRowid));}
function update(id,content,categoryId){run('UPDATE messages SET content=?,category_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',content,categoryId,id);return get(id);}
function remove(id){return run('DELETE FROM messages WHERE id=?',id).changes>0;}
function react(messageId,userId,type){
 // UPSERT executed atomically within a transaction together with the existence checks
 db.exec('BEGIN IMMEDIATE');try{
  if(!get(messageId)) {db.exec('ROLLBACK');return null;}
  if(!one('SELECT id FROM users WHERE id=?',userId)){db.exec('ROLLBACK');return false;}
  run(`INSERT INTO message_reactions(message_id,user_id,reaction_type) VALUES (?,?,?) ON CONFLICT(message_id,user_id) DO UPDATE SET reaction_type=excluded.reaction_type`,messageId,userId,type);
  const row=one('SELECT * FROM message_reactions WHERE message_id=? AND user_id=?',messageId,userId);
  db.exec('COMMIT');return row;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
const stats=()=>sql('SELECT c.id,c.name,COUNT(m.id) AS message_count FROM categories c LEFT JOIN messages m ON m.category_id=c.id GROUP BY c.id,c.name ORDER BY c.id');
module.exports={db,file,sql,one,run,list,get,create,update,remove,react,stats,close:()=>db.close()};
