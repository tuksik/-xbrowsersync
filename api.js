var xBrowserSync = xBrowserSync || {};
xBrowserSync.API = xBrowserSync.API || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.API.Main 
 * Description: Main API class, configures server and sets up routes.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.API.Main = function () {
    'use strict';

    var restify = require('restify');
    var bunyan = require('bunyan');
    var fs = require('fs');
    var global = require('./global.js');
    var config = require('./config.js');
    var db = require('./db.js');
    var bookmarks = require('./bookmarks.js');
    var status = require('./status.js');

    var server;

    var createRoutes = function () {
        // Index page
        server.get('/', getIndexPage);

        // Status
        server.get({ path: '/status', version: config.version }, status.getStatus);

        // Bookmarks
        server.post({ path: '/bookmarks', version: config.version }, bookmarks.createBookmarks);
        server.get({ path: '/bookmarks/:id/:secretHash', version: config.version }, bookmarks.getBookmarks);
        server.post({ path: '/bookmarks/:id', version: config.version }, bookmarks.updateBookmarks);
        server.get({ path: '/bookmarks/:id/lastupdated/:secretHash', version: config.version }, bookmarks.getLastUpdated);
    };

    var createServer = function () {
        var log = (config.log.enabled) ?
            bunyan.createLogger({
                name: config.log.name,
                level: config.log.level,
                streams: [
                    { 
                        path: config.log.path,
                        level: config.log.level
                    }
                ],
                serializers: bunyan.stdSerializers
            })
            : null;

        server = restify.createServer({
            log: log,
            name: global.apiName
        });

        server.listen(config.server.port, config.server.host, function () {
            console.log('%s: %s started on %s:%d ...', Date(Date.now()), global.apiName, config.server.host, config.server.port);
        });
        
        server.pre(function (req, res, next) {
            req.log.info({ req: req });
            return next();
        });

        server.use(restify.CORS());
        server.use(
            function crossOrigin(req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'X-Requested-With');
                return next();
            }
        );

        server.use(restify.queryParser());

        server.use(restify.bodyParser({
            maxBodySize: config.maxSyncSize
        }));

        server.use(restify.throttle({
            rate: config.throttle.rate,
            burst: config.throttle.burst,
            ip: true
        }));
    };

    var getIndexPage = function (req, res, next) {
        fs.readFile('index.html', function (err, data) {
            if (err) {
                next(err);
                return;
            }

            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(data);
            next();
        });
    };

    // Initialise server
    (function () {
        createServer();
        db.connect();
        createRoutes();
    } ());
};

module.exports = xBrowserSync.API.Main();