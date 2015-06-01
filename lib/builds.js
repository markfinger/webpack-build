'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');

module.exports = {
  convenience: function(config) {
    config.plugins = config.plugins || [];

    config.plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.NoErrorsPlugin()
    );

    return config;
  },
  hotModuleReplacement: function(config, opts) {
    if (!opts.socketRoot) {
      console.error('Webpack: socketRoot must be defined to inject hmr runtime');
      return config;
    }

    if (config.entry) {
      var socketData = JSON.stringify({
        root: opts.socketRoot,
        path: opts.socketPath,
        namespace: opts.socketNamespace
      });

      console.log('socketData', socketData)

      var devClient = [
        'webpack-wrapper/lib/hmr_client?' + socketData,
        'webpack/hot/dev-server'
      ];

      if (_.isArray(config.entry)) {
        config.entry = devClient.concat(config.entry);
      } else if (_.isObject(config.entry)) {
        _.forEach(config.entry).forEach(function(value, key) {
          config.entry[key] = devClient.concat(value);
        });
      } else {
        config.entry = devClient.concat([config.entry]);
      }
    }

    config.plugins = config.plugins || [];

    config.plugins.push(new webpack.HotModuleReplacementPlugin());

    config.output = config.output || {};

    var staticUrl = opts.staticUrl;

    if (!_.endsWith(staticUrl, '/')) {
      staticUrl += '/';
    }

    config.output.publicPath = staticUrl;

    // TODO: see if this is still needed
    config.recordsPath = path.join(opts.outputPath, 'webpack.records-' + opts.hash + '.json');

    return config;
  },
  development: function(config) {
    config.output = config.output || {};

    config.devtool = 'eval-source-map';

    config.output.pathinfo = true;

    this.convenience(config);

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development')
        }
      })
    );

    return config;
  },
  production: function(config) {
    config.devtool = 'source-map';

    this.convenience(config);

    config.plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production')
        }
      })
    );

    return config;
  }
};