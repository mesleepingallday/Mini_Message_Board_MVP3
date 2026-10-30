const express=require('express');
const path=require('node:path');
const store=require('./db');
const app=express();
app.use(express.json({limit:'16kb'}));
app.use(express.static(path.join(__dirname,'public')));
const id=v=>/^[1-9]\d*$/.test(String(v)) && Number.isSafeInteger(Number(v))?Number(v):null;
const fail=(res,code,msg)=>res.status(code).json({error:msg});
const validMessage=x=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=500;
const hasUser=n=>!!store.one('SELECT id FROM users WHERE id=?',n);
const hasCategory=n=>n===null||!!store.one('SELECT id FROM categories WHERE id=?',n);
app.get('/api/users',(req,res)=>res.json(store.sql('SELECT id,username,display_name FROM users ORDER BY id')));
app.get('/api/categories',(req,res)=>res.json(store.sql('SELECT * FROM categories ORDER BY id')));
app.get('/api/stats/categories',(req,res)=>res.json(store.stats()));
app.get('/api/messages',(req,res)=>{
 const page=id(req.query.page??'1'),limit=id(req.query.limit??'10');
 if(!page||!limit||limit>100)return fail(res,400,'Phân trang không hợp lệ (limit <=100).');
 const categoryId=req.query.categoryId===undefined?null:id(req.query.categoryId);
 if(req.query.categoryId!==undefined&&!categoryId)return fail(res,400,'categoryId không hợp lệ.');
 const q=req.query.q??'';
 if(typeof q!=='string'||q.length>100)return fail(res,400,'Từ khóa không hợp lệ.');
 res.json(store.list({q,categoryId,page,limit}));
});
app.get('/api/messages/:id',(req,res)=>{const n=id(req.params.id);if(!n)return fail(res,400,'ID không hợp lệ.');const row=store.get(n);return row?res.json(row):fail(res,404,'Không tìm thấy thông điệp.');});
app.post('/api/messages',(req,res)=>{
 const {message,userId=2,categoryId=1}=req.body??{};
 const u=id(userId),c=categoryId===null?null:id(categoryId);
 if(!validMessage(message)||!u||(categoryId!==null&&!c))return fail(res,400,'Dữ liệu thông điệp không hợp lệ.');
 if(!hasUser(u)||!hasCategory(c))return fail(res,400,'Người dùng hoặc danh mục không tồn tại.');
 res.status(201).json(store.create(message.trim(),u,c));
});
app.patch('/api/messages/:id',(req,res)=>{
 const n=id(req.params.id);if(!n)return fail(res,400,'ID không hợp lệ.');
 const old=store.get(n);if(!old)return fail(res,404,'Không tìm thấy thông điệp.');
 const message=req.body?.message??old.message;
 const rawCat=req.body?.categoryId===undefined?old.category_id:req.body.categoryId;
 const c=rawCat===null?null:id(rawCat);
 if(!validMessage(message)||(rawCat!==null&&!c)||!hasCategory(c))return fail(res,400,'Dữ liệu cập nhật không hợp lệ.');
 res.json(store.update(n,message.trim(),c));
});
app.delete('/api/messages/:id',(req,res)=>{const n=id(req.params.id);if(!n)return fail(res,400,'ID không hợp lệ.');return store.remove(n)?res.status(204).end():fail(res,404,'Không tìm thấy thông điệp.');});
app.put('/api/messages/:id/reaction',(req,res)=>{
 const n=id(req.params.id),u=id(req.body?.userId??2),type=req.body?.reactionType;
 if(!n||!u||!['like','love','wow'].includes(type))return fail(res,400,'Cảm xúc không hợp lệ.');
 const row=store.react(n,u,type);return row===null?fail(res,404,'Không tìm thấy thông điệp.'):row===false?fail(res,400,'Người dùng không tồn tại.'):res.json(row);
});
app.delete('/api/messages/:id/reaction',(req,res)=>{
 const n=id(req.params.id),u=id(req.query.userId??'2');if(!n||!u)return fail(res,400,'ID không hợp lệ.');
 if(!store.get(n))return fail(res,404,'Không tìm thấy thông điệp.');
 return store.run('DELETE FROM message_reactions WHERE message_id=? AND user_id=?',n,u).changes?res.status(204).end():fail(res,404,'Chưa có cảm xúc.');
});
app.use('/api',(req,res)=>fail(res,404,'API không tồn tại.'));
app.use((err,req,res,next)=>{
 if(err.type==='entity.parse.failed')return fail(res,400,'JSON không hợp lệ.');
 console.error(err);return fail(res,500,'Lỗi máy chủ.');
});
module.exports=app;
