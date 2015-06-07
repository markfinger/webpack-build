'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');

module.exports = function hmrConfig(config, opts) {
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
    // TODO: replace?
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
};