'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (options = {}) {
    let logs = {
        error: null,
        access: null
    };

    options = clone(options);
    options.appenders = appendersHandler(options.appenders);

    _log4js2.default.configure(options);
    logs.error = getLogger('error');
    logs.access = getLogger('access');
    logs.error.setLevel('INFO');
    logs.access.setLevel('INFO');

    return async function _logger(ctx, next) {
        let context = ctx.app.context;

        if (!context.logger) {
            context.logger = function (err, level = 'error') {
                logs.error[level].call(logs.error, ...formatErrorMessage(ctx.url, err, getErrorInfo()));
            };
        }

        await next();

        logs.access.info(ctx.ip, ctx.method, ctx.url, `${ctx.protocol.toUpperCase()}/${ctx.req.httpVersion}`, ctx.status, ctx.length || null, ctx.get('referrer'), ctx.header['user-agent']);
    };
};

var _log4js = require('log4js');

var _log4js2 = _interopRequireDefault(_log4js);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let defaultAppenders = ['error', 'access'].map(item => ({
    backups: 4,
    type: 'file',
    category: item,
    maxLogSize: 10485760,
    filename: `${item}.log`
}));

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getLogger(category) {
    return _log4js2.default.getLogger(category);
}

function appendersHandler(appenders = defaultAppenders) {
    let paths = [];

    appenders = appenders.map(item => {
        if (item.type === 'file') {
            item.filename = adjustFileName(item.filename);
            paths.push((0, _path.dirname)(item.filename));
        }

        return item;
    });

    paths.map(path => _mkdirp2.default.sync(path));

    return appenders;
}

function adjustFileName(filename) {
    let cwd, fileInfo;

    cwd = process.cwd();

    if ((0, _path.isAbsolute)(filename)) {
        return filename;
    }

    filename = (0, _path.resolve)((0, _path.join)(cwd, filename));
    fileInfo = (0, _path.parse)(filename);

    if (fileInfo.dir.replace(cwd, '').length) {
        return filename;
    }

    return (0, _path.resolve)((0, _path.join)(cwd, './logs', fileInfo.base));
}

function getErrorInfo() {
    let details = extractErrorDetails(new Error().stack.split('\n').slice(3)[0]);

    if (details && details.length === 5) {
        return {
            method: details[1],
            path: details[2],
            line: details[3],
            pos: details[4],
            file: (0, _path.basename)(details[2])
        };
    }
}

function extractErrorDetails(errorInfo) {
    let rule1, rule2;

    rule1 = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
    rule2 = /at\s+()(.*):(\d*):(\d*)/gi;

    return rule1.exec(errorInfo) || rule2.exec(errorInfo);
}

function formatErrorMessage(url, exception, errorInfo) {
    return [url, `(${errorInfo.file}:${errorInfo.line}:${errorInfo.method})`, exception];
}