const app=require('./app');
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`MVP 3: http://localhost:${port}`));
