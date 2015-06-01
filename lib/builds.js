'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');

module.exports = {
  improve: function(config) {
    config.plugins = config.plugins || [];

    config.plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.NoErrorsPlugin()
    );

    return config;
  },
  hmr: function(config, opts) {
    if (!opts.hmrRoot) {
      console.error('Webpack: hmrRoot must be defined to inject hmr runtime');
      return config;
    }

    if (config.entry) {
      var socketOpts = JSON.stringify({
        root: opts.hmrRoot,
        path: opts.hmrPath,
        namespace: opts.hmrNamespace
      });

      var devClient = [
        'webpack-wrapper/lib/hmr/client?' + socketOpts,
        'webpack/hot/only-dev-server'
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
  dev: function(config) {
    config.output = config.output || {};

    config.devtool = 'eval-source-map';

    config.output.pathinfo = true;

    config = this.improve(config);

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development')
        }
      })
    );

    return config;
  },
  prod: function(config) {
    config.devtool = 'source-map';

    config = this.improve(config);

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