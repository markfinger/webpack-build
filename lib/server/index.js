var http = require('http');
var express = require('express');
var winston = require('winston');
var hmr = require('../hmr');
var build = require('../');

var Server = function Server(opts) {
  opts = opts || {};

  this.app = express();
  this.server = http.Server(this.app);

  this.root = opts.root || process.cwd();

  hmr.addTo(this.server);

  this.logger = new winston.Logger({
    transports: [
      new winston.transports.Console({
        colorize: true,
        timestamp: function() {
          var time = new Date();

          var ms = time.getMilliseconds();
          if (ms < 10) {
            ms = '00' + ms;
          } else if (ms < 100) {
            ms = '0' + ms;
          }

          return time.getHours() + ':' + time.getMinutes() + ':' + ms;
        },
        prettyPrint: true,
        showLevel: true
      })
    ],
    exitOnError: false
  });

  this.app.use(function requestLog(req, res, next) {
    this.logger.info(req.method + ' ' + req.url);

    next();
  }.bind(this));

  this.app.get('/build', function build(req, res, next) {

  }.bind(this));
};

Server.prototype.listen = function listen() {
  this.server.listen.apply(this.server, arguments);
};

module.exports = Server;