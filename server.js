const http=require('http');
const app=require('./app');
const { initializeSocket } = require('./socket');
const port=process.env.PORT;

const server=http.createServer(app);

initializeSocket(server);

server.listen(port,()=>{
    console.log(`server is listening at port ${port}`);
});