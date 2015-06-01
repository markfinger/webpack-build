'use strict';

var options = require('../options');
var socketIo = require('socket.io');

var io;

module.exports = {
  addTo: function(server, path) {
    path = path || options.generate().hmrPath;

    io = socketIo(server, {path: path});

    return io;
  },
  bindCompiler: function(compiler, opts) {
    var namespace = opts.hmrNamespace;
    var logger = opts.logger;

    if (logger) {
      logger.info('Webpack: binding compiler for hmr under namespace: ' + namespace);
    }

    var nsp = io.of(namespace);

    nsp.on('connection', function(socket) {
      if (logger) {
        logger.info('Webpack: hmr namespace ' + namespace + ' opened connection ' + socket.id);
      }

      socket.emit('hot');
    });

    compiler.plugin('invalid', function() {
      if (logger) {
        logger.info('Webpack: sending hmr invalid signal to ' + namespace);
      }

      nsp.emit('invalid');
    });

    compiler.plugin('done', function(stats) {
      if (logger) {
        logger.log('Webpack: sending updated stats to ' + namespace);
      }

      this.send(nsp, stats.toJson());
    }.bind(this));
  },
  send: function(nsp, stats) {
    if (
      stats &&
      stats.assets &&
      stats.assets.every(function(asset) {
        return !asset.emitted;
      })
    ) {
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
  }
};