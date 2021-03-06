import fs from 'fs'
import koa from 'koa'
import test from 'ava'
import logger from '../src'
import mount from 'koa-mount'
import request from 'request'
import { resolve, join } from 'path'

const req = request.defaults({
    baseUrl: 'http://localhost:3000'
})

test.before.cb((t) => {
    let app = new koa()
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
            filename: resolve(join(process.cwd(), './logs', 'access.log'))
        }, {
            backups: 4,
            type: 'file',
            category: 'test',
            maxLogSize: 10485760,
            filename: './logs/test.log'
        }]
    }

    app.use(logger(options))
    app.use(mount('/access', async function(ctx, next) {
        ctx.body = 'logger'
    }))
    app.use(mount('/error', async function(ctx, next) {
        ctx.logger(new Error('test'))
        ctx.body = 'logger'
    }))
    app.listen(3000, t.end)
})

test.cb('access log', (t) => {
    req.get('/access', (err, res, body) => {
        let content = fs.readFileSync('logs/access.log')

        t.is(body, 'logger')
        t.true(content.length !== 0)
        t.end()
    })
})

test.cb('error log', (t) => {
    req.get('/error', (err, res, body) => {
        let content = fs.readFileSync('logs/error.log')

        t.is(body, 'logger')
        t.true(content.length !== 0)
        t.end()
    })
})