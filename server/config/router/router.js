const fs = require('fs')
const path = require('path')
var Novel = require('../models/m-novel.js')
var Chapter = require('../models/m-chapter.js')
var Logger = require('../models/m-logger.js')
var express = require("express")
var crypto = require('crypto')

var { key } = require('../config.js')

const cipher = (function (key) {
    return function cipher(text) {
        var ci = crypto.createCipher('aes-256-cbc', key)
        var r = ''
        r += ci.update(text, 'utf-8', 'hex')
        r += ci.final('hex')
        return r
    }
})(key)

const decipher = function cipher(key, text) {
    var ci = crypto.createDecipher('aes-256-cbc', key)
    var r = ''
    r += ci.update(text, 'hex', 'utf-8')
    r += ci.final('utf-8')
    return r
}.bind(null, key)

const checkRequst = function (req) {
    return req.headers['x-response-type'] == 'multipart' && req.query.pbj == 1
}

var dataServer = express()
var ssrServer = express()

module.exports = function (app) {
    
    app.use(express.static(path.join(__dirname, '../../dist')))
    app.get('/favicon.ico', function (req, res) {
        fs.createReadStream(path.join(__dirname, '../icons/ic_local_library_black_48dp_1x.png')).pipe(res)
    })
    app.get('/favicon.svg', function (req, res) {
        fs.createReadStream(path.join(__dirname, '../icons/ic_local_library_black_48px.svg')).pipe(res)
    })
    app.get('/favicon.png', function (req, res) {
        fs.createReadStream(path.join(__dirname, '../icons/ic_local_library_black_48dp_2x.png')).pipe(res)
    })
    app.use(function (req, res, next) {
        //filter request of crawler
        if (req.headers["user-agent"].indexOf('python') > -1) {
            res.end('404')
            return
        }
        var obj = Object.assign({
            method: req.method,
            url: decodeURI(req.url)
        }, req.headers)
        var _logger = new Logger(obj)
        _logger.save().catch(function (err) {
            console.log(err)
        })
        next()
    })


    app.use(function (req, res, next) {
        if (checkRequst(req)) {
            dataServer(req, res, next)
        } else {
            ssrServer(req, res, next)
        }
        return
    })

    ssrServer.set('view engine', 'ejs')
    ssrServer.set('views', path.join(__dirname, '../views'))
    // ssrServer.get('/', function (req, res) {
    //     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
    //     res.render('index', {
    //         title: '无限中文小说'
    //     })
    // })
    ssrServer.use(function (req, res) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        try {
            fs.stat(path.join(__dirname, '../../dist/index.html'),(err,stat)=>{
                if(err){
                    console.log(err)
                    console.log('stat error')
                    res.end('no such file')
                }else{
                    var stream = fs.createReadStream(path.join(__dirname, '../../dist/index.html'))
                    stream.pipe(res)
                }
            })
            
        } catch (error) {
            res.end('hhh')
        }
        return
    })

    if(process.env.NODE_ENV !== 'production'){
        dataServer.use((req,res,next)=>{
            setTimeout(() => {
                next&&next()
            }, 1500);
        })
        console.log(`开发环境延迟1.5秒返回数据！`)
    }


    dataServer.post('/signup',function(req,res){
        let buf = new Buffer('')
        req.on('data',(buffer)=>{
            buf=Buffer.concat([buf,buffer])
        })
        req.on('end',()=>{
            res.end(buf.toString())
        })
    })

    
    dataServer.get('/index', function (req, res, next) {
        Novel.random(21, function (err, novels) {
            if (err) {
                console.log(err)
            }
            res.end(cipher(JSON.stringify({
                novels: novels
            })))
        })
    })
    dataServer.get('/category', function (req, res) {
        if (!req.query.c) {
            res.end(cipher(JSON.stringify({
                novels: []
            })))
            return
        }
        var reg = new RegExp(req.query.c, 'g')
        Novel.find({
            category: reg
        }, {
                href: 0,
                meta: 0,
                "chapters.href": 0
            }).limit(20).then(function (novels) {
                res.end(cipher(JSON.stringify({
                    novels: novels
                })))
            })
    })
    dataServer.get('/novel', function (req, res, next) {
        Novel.findOne({
            _id: req.query.v
        }, {
                href: 0,
                meta: 0,
                "chapters.href": 0
            }).exec(function (err, novel) {
                res.end(cipher(JSON.stringify(novel)))
            })
    })
    dataServer.get('/chapter', function (req, res, next) {
        if (req.headers['x-response-type'] == 'multipart' && req.query.pbj == 1) {
            //处理无参数传入
            if (req.query.c == "") { }
            Chapter.findOne({
                _id: req.query.c
            }, {
                    href: 0,
                    meta: 0
                }).exec(function (err, chapter) {
                    res.end(cipher(JSON.stringify(chapter)))
                })
        } else {
            next && next()
        }
    })
    dataServer.get('/search', function (req, res, next) {
        var key = req.query.key//.replace()
        var reg = new RegExp(key.split('').join('.*'), 'g')
        Novel.find({
            title: reg
        }, {
                href: 0,
                meta: 0
            }).limit(20).exec(function (err, novels) {
                res.end(cipher(JSON.stringify(novels)))
            })
    })
    return app
}