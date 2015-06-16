'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _socketIo = require('socket.io');

var _socketIo2 = _interopRequireDefault(_socketIo);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var logger = (0, _log2['default'])('hmr');
var namespaces = Object.create(null);

var io = null;

var addToServer = function addToServer(server) {
  io = (0, _socketIo2['default'])(server, { path: _optionsDefaults2['default'].hmrPath });
};

exports.addToServer = addToServer;
var getNamespace = function getNamespace(opts) {
  return namespaces[opts.hmrNamespace];
};

var register = function register(opts) {
  if (_cluster2['default'].isWorker) {
    return process.send({
      type: 'hmr-register',
      data: { opts: opts }
    });
  }

  var namespace = opts.hmrNamespace;

  if (!namespaces[namespace]) {
    var nsp = io.of(namespace);

    namespaces[namespace] = nsp;

    nsp.on('connection', function (socket) {
      logger('namespace ' + namespace + ' opened connection ' + socket.id);

      socket.emit('hot');
    });

    logger('registered hmr namespace: ' + namespace);
  }
};

exports.register = register;
var emitDone = function emitDone(opts, stats) {
  if (_lodash2['default'].isFunction(stats.toJson)) {
    stats = stats.toJson();
  }

  if (_cluster2['default'].isWorker) {
    return process.send({
      type: 'hmr-done',
      data: {
        opts: opts,
        stats: stats
      }
    });
  }

  logger('emitting done signal to ' + opts.hmrNamespace);

  var nsp = getNamespace(opts);

  if (stats && stats.assets && stats.assets.every(function (asset) {
    return !asset.emitted;
  })) {
    return nsp.emit('no-change');
  }

  nsp.emit('hash', stats.hash);

  if (stats.errors.length > 0) {
    nsp.emit('errors', stats.errors);
  } else if (stats.warnings.length > 0) {
    nsp.emit('warnings', stats.warnings);
  } else {
    nsp.emit('success');
  }
};

exports.emitDone = emitDone;
var emitInvalid = function emitInvalid(opts) {
  if (_cluster2['default'].isWorker) {
    return process.send({
      type: 'hmr-invalid',
      data: { opts: opts }
    });
  }

  logger('emitting invalid signal to ' + opts.hmrNamespace);

  var nsp = getNamespace(opts);
  nsp.emit('invalid');
};

exports.emitInvalid = emitInvalid;
exports['default'] = {
  addToServer: addToServer,
  register: register,
  emitInvalid: emitInvalid,
  emitDone: emitDone
};
//# sourceMappingURL=index.js.map