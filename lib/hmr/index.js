'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _socketIo = require('socket.io');

var _socketIo2 = _interopRequireDefault(_socketIo);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var io = null;

var addToServer = function addToServer(server) {
  io = (0, _socketIo2['default'])(server, { path: _optionsDefaults2['default'].hmrPath });
};

exports.addToServer = addToServer;
var send = function send(nsp, stats) {
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

exports.send = send;
var bindCompiler = function bindCompiler(compiler, opts) {
  var namespace = opts.hmrNamespace;
  var logger = (0, _log2['default'])('hmr', opts);

  var nsp = io.of(namespace);

  logger('bound compiler under hmr namespace: ' + namespace);

  nsp.on('connection', function (socket) {
    logger('namespace ' + namespace + ' opened connection ' + socket.id);

    socket.emit('hot');
  });

  compiler.plugin('invalid', function () {
    logger('sending invalid signal to ' + namespace);

    nsp.emit('invalid');
  });

  compiler.plugin('done', function (stats) {
    logger('sending updated stats to ' + namespace);

    send(nsp, stats.toJson());
  });
};

exports.bindCompiler = bindCompiler;
exports['default'] = {
  addToServer: addToServer,
  send: send,
  bindCompiler: bindCompiler
};
//# sourceMappingURL=index.js.map