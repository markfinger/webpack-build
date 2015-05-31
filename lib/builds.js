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
    if (config.entry) {
      var devClient = [
        //'webpack-dev-server/client?http://127.0.0.1:9008',
        //'webpack/hot/dev-server'
      ];

      if (_.isArray(config.entry)) {
        config.entry = devClient.concat(config.entry);
      } else if (_.isObject(config.entry)) {
        _.forEach(config.entry).forEach(function(value, key) {
          config.entry[key] = devClient.concat(value);
        });
      } else {
        config.entry = [config.entry].concat(devClient);
      }
    }

    config.plugins = config.plugins || [];

    config.plugins.push(new webpack.HotModuleReplacementPlugin());

    config.output = config.output || {};

    var publicPath = opts.staticUrl;

    if (!_.endsWith(publicPath, '/')) {
      publicPath += '/';
    }

    config.output.publicPath = publicPath;

    // TODO: see if this is still needed
    config.recordsPath = path.join(opts.staticRoot, 'webpack.records.json');

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