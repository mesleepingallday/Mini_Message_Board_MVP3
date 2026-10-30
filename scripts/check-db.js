const d=require('../db');
console.log('DB:',d.file);
console.table(d.sql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"));
console.log('schema version:',d.one('PRAGMA user_version').user_version);
console.log('foreign keys:',d.one('PRAGMA foreign_keys').foreign_keys);
console.log('integrity:',d.one('PRAGMA integrity_check').integrity_check);
console.log('legacy user rows:',d.one('SELECT COUNT(*) AS n FROM messages WHERE user_id=1').n);
d.close();
