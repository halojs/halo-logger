import fs from 'fs'
import koa from 'koa'
import test from 'ava'
import logger from '../src'
import mount from 'koa-mount'
import request from 'request'

const req = request.defaults({
    baseUrl: 'http://localhost:3000'
})

test.before.cb((t) => {
    let app = koa()
    let options = {
        appenders: [{
            backups: 4,
            type: 'file',
            category: 'error',
            maxLogSize: 10485760,
            filename: 'error.log'
        }, {
            backups: 4,
            type: 'file',
            category: 'access',
            maxLogSize: 10485760,
            filename: 'access.log'
        }]
    }

    app.use(logger(options))
    app.use(mount('/access', function *() {
        this.body = 'logger'
    }))
    app.use(mount('/error', function *() {
        this.logger(new Error('test'))
        this.body = 'logger'
    }))
    app.listen(3000, t.end)
})

test.cb((t) => {
    req.get('/access', (err, res, body) => {
        let content = fs.readFileSync('logs/access.log')

        t.is(body, 'logger')
        t.true(content.length !== 0)
        t.end()
    })
})

test.cb((t) => {
    req.get('/error', (err, res, body) => {
        let content = fs.readFileSync('logs/error.log')

        t.is(body, 'logger')
        t.true(content.length !== 0)
        t.end()
    })
})