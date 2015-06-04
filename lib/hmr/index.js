'use strict';

var path = require('path');
var options = require('../options');
var socketIo = require('socket.io');
var webpack = require('webpack');
var _ = require('lodash');

module.exports = {
  io: null,
  addTo: function(server, path) {
    path = path || options.generate().hmrPath;

    this.io = socketIo(server, {path: path});
  },
  bindCompiler: function(compiler, opts) {
    var namespace = opts.hmrNamespace;
    var logger = opts.logger;

    logger('binding compiler for hmr under namespace: ' + namespace);
    var nsp = this.io.of(namespace);

    nsp.on('connection', function(socket) {
      logger('hmr namespace ' + namespace + ' opened connection ' + socket.id);
      socket.emit('hot');
    });

    compiler.plugin('invalid', function() {
      logger('sending hmr invalid signal to ' + namespace);
      nsp.emit('invalid');
    });

    compiler.plugin('done', function(stats) {
      logger('sending updated stats to ' + namespace);
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
  },
  updateConfig: function(config, opts) {
    if (!opts.hmrRoot) {
      throw new Error('hmrRoot must be defined to inject hmr runtime');
    }

    if (!opts.outputPath) {
      throw new Error('outputPath must be defined to inject hmr runtime');
    }

    if (!opts.publicPath) {
      throw new Error('publicPath must be defined to inject hmr runtime');
    }

    var socketOpts = JSON.stringify({
      root: opts.hmrRoot,
      path: opts.hmrPath,
      namespace: opts.hmrNamespace
    });

    var devClient = [
      'webpack-build/lib/hmr/client?' + socketOpts,
      'webpack/hot/only-dev-server'
    ];

    config.entry = config.entry || [];

    if (_.isArray(config.entry)) {
      config.entry = devClient.concat(config.entry);
    } else if (_.isObject(config.entry)) {
      _.forEach(config.entry).forEach(function(value, key) {
        config.entry[key] = devClient.concat(value);
      });
    } else {
      config.entry = devClient.concat([config.entry]);
    }

    config.plugins = config.plugins || [];

    config.plugins.push(new webpack.HotModuleReplacementPlugin());

    config.output = config.output || {};

    config.output.publicPath = opts.publicPath;

    config.recordsPath = path.join(opts.outputPath, 'webpack.records-' + opts.hash + '.json');

    return config;
  }
};