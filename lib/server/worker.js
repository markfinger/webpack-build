'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _ = require('..');

var _2 = _interopRequireDefault(_);

var _utils = require('./utils');

_sourceMapSupport2['default'].install();

_debug2['default'].enable(_package2['default'].name + ':*');

_log2['default'].namespace += ':worker:' + process.pid;

var logger = (0, _log2['default'])();

logger('ready');

process.send('ready');

process.on('message', function (opts) {
  logger('received request for build ' + opts.buildHash);

  (0, _2['default'])(opts, function (err, data) {
    process.send({
      opts: opts,
      data: (0, _utils.processData)(err, data)
    });
  });
});
//# sourceMappingURL=worker.js.map