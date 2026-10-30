const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
let present=true;try{require.resolve('express')}catch{present=false}
test('HTTP API GET/POST/PATCH/DELETE, errors, reactions and stats',{skip:!present&&'Cần chạy npm install để kiểm thử HTTP'},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mvp3-http-'));process.env.DB_FILE=path.join(dir,'messages.db');const app=require('../app');const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const req=async(p,method='GET',body)=>{const r=await fetch(base+p,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:r.status===204?null:await r.json()}};
 try{
 const c=await req('/api/messages','POST',{message:'Test API',userId:2,categoryId:1});assert.equal(c.status,201);const id=c.data.id;
 assert.equal((await req('/api/messages?q=Test&page=1&limit=5')).data.pagination.total,1);
 assert.equal((await req('/api/messages/'+id,'PATCH',{message:'Đã sửa'})).status,200);
 assert.equal((await req('/api/messages/'+id+'/reaction','PUT',{reactionType:'like'})).status,200);
 assert.equal((await req('/api/stats/categories')).status,200);
 assert.equal((await req('/api/messages','POST',{message:''})).status,400);
 assert.equal((await req('/api/messages/999999')).status,404);
 assert.equal((await req('/api/messages/'+id,'DELETE')).status,204);
 assert.equal((await req('/api/messages/'+id)).status,404);
 }finally{await new Promise(r=>server.close(r));require('../db').close();fs.rmSync(dir,{recursive:true,force:true})}
});
