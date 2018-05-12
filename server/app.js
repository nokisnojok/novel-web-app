var express = require('express')
const fs = require('fs')


var mongoose = require('mongoose')
var Novel = require('./config/models/m-novel.js')
var Chapter = require('./config/models/m-chapter.js')
var Logger = require('./config/models/m-logger.js')
const { port, dbUrl } = require('./config/config.js') 


function App(){
    var app = express()
    app.set('view engine', 'ejs')
    app.set('views', './config/views')
    require('./config/router/router.js')(app)
    app.listen(port, function (err) {
        if (err)
            return console.log(err)
        console.log(`service start at http:\/\/localhost:${port}`)
    })
    return app
}

// return 
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    console.log(`主进程 ${process.pid} 正在运行`);
    // 衍生工作进程。
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`工作进程 ${worker.process.pid} 已退出`);
    });
} else {
    // 工作进程可以共享任何 TCP 连接。
    // 共享的是一个 HTTP 服务器。
    mongoose.connect(dbUrl, {
        useMongoClient: true,
    }, function () {
        console.log(`connect mongo ok!`);
        App();
    })
    console.log(`工作进程 ${process.pid} 已启动`);
}