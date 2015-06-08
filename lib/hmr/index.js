'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _socketIo = require('socket.io');

var _socketIo2 = _interopRequireDefault(_socketIo);

var _options = require('../options');

var options = _interopRequireWildcard(_options);

var io = null;

var addTo = function addTo(server, path) {
  path = path || options.generate().hmrPath;

  io = (0, _socketIo2['default'])(server, { path: path });
};

exports.addTo = addTo;
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
  var logger = opts.logger;
  var nsp = io.of(namespace);

  logger('bound compiler under hmr namespace: ' + namespace);

  nsp.on('connection', function (socket) {
    logger('hmr namespace ' + namespace + ' opened connection ' + socket.id);

    socket.emit('hot');
  });

  compiler.plugin('invalid', function () {
    logger('sending hmr invalid signal to ' + namespace);

    nsp.emit('invalid');
  });

  compiler.plugin('done', function (stats) {
    logger('sending updated stats to ' + namespace);

    send(nsp, stats.toJson());
  });
};
exports.bindCompiler = bindCompiler;
//# sourceMappingURL=index.js.map