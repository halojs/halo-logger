import log4js from 'log4js'
import mkdirp from 'mkdirp'
import { parse, join, resolve, isAbsolute, dirname, basename } from 'path'

let defaultAppenders = ['error', 'access'].map((item) => ({
    backups: 4,
    type: 'file',
    category: 'error',
    maxLogSize: 10485760,
    filename: `${item}.log`
}))

export default function (options = {}) {
    let logs = {
        error: null,
        access: null
    }

    options = clone(options)
    options.appenders = appendersHandler(options.appenders)

    log4js.configure(options)
    logs.error = getLogger('error')
    logs.access = getLogger('access')
    logs.error.setLevel('INFO')
    logs.access.setLevel('INFO')

    return function* _logger(next) {
        let ctx = this.app.context

        if (!ctx.logger) {
            ctx.logger = function (err, level = 'error') {
                logs.error[level].call(logs.error, ...formatErrorMessage(this.url, err, getErrorInfo()))
            }
        }

        yield* next

        logs.access.info(
            this.ip,
            this.method,
            this.url,
            `${this.protocol.toUpperCase()}/${this.req.httpVersion}`,
            this.status,
            this.length || null,
            this.get('referrer'),
            this.header['user-agent']
        )
    }
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function getLogger(category) {
    return log4js.getLogger(category)
}

function appendersHandler(appenders = defaultAppenders) {
    let paths = []

    appenders = appenders.map((item) => {
        if (item.type === 'file') {
            item.filename = adjustFileName(item.filename)
            paths.push(dirname(item.filename))
        }

        return item
    })

    paths.map((path) => mkdirp.sync(path))

    return appenders
}

function adjustFileName(filename) {
    let cwd, fileInfo

    cwd = process.cwd()

    if (isAbsolute(filename)) {
        return filename
    }

    filename = resolve(join(cwd, filename))
    fileInfo = parse(filename)

    if (fileInfo.dir.replace(cwd, '').length) {
        return filename
    }

    return resolve(join(cwd, './logs', fileInfo.base))
}

function getErrorInfo() {
    let details = extractErrorDetails((new Error()).stack.split('\n').slice(3)[0])

    if (details && details.length === 5) {
        return {
            method: details[1],
            path: details[2],
            line: details[3],
            pos: details[4],
            file: basename(details[2])
        }
    }
}

function extractErrorDetails(errorInfo) {
    let rule1, rule2

    rule1 = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi
    rule2 = /at\s+()(.*):(\d*):(\d*)/gi

    return rule1.exec(errorInfo) || rule2.exec(errorInfo)
}

function formatErrorMessage(url, exception, errorInfo) {
    return [url, `(${errorInfo.file}:${errorInfo.line}:${errorInfo.method})`, exception]
}