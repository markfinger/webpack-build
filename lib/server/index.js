'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _hmr = require('../hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _ = require('..');

var _2 = _interopRequireDefault(_);

var Server = (function () {
  function Server(opts) {
    var _this = this;

    _classCallCheck(this, Server);

    opts = opts || {};

    this.app = (0, _express2['default'])();
    this.server = _http2['default'].Server(this.app);

    this.root = opts.root || process.cwd();

    _hmr2['default'].addTo(this.server);

    this.logger = new _winston2['default'].Logger({
      transports: [new _winston2['default'].transports.Console({
        colorize: true,
        timestamp: function timestamp() {
          var time = new Date();

          var ms = time.getMilliseconds();
          if (ms < 10) {
            ms = '00' + ms;
          } else if (ms < 100) {
            ms = '0' + ms;
          }

          return '' + time.getHours() + ':' + time.getMinutes() + ':' + ms;
        },
        prettyPrint: true,
        showLevel: true
      })],
      exitOnError: false
    });

    this.app.use(function (req, res, next) {
      _this.logger.info(req.method + ' ' + req.url);

      next();
    });

    this.app.get('/build', function (req, res, next) {});
  }

  _createClass(Server, [{
    key: 'listen',
    value: function listen() {
      this.server.listen.apply(this.server, arguments);
    }
  }]);

  return Server;
})();

exports['default'] = Server;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map