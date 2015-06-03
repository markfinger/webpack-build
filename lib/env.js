'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');

var improve = function(config) {
  config.plugins = config.plugins || [];

  config.plugins.push(
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoErrorsPlugin()
  );
};

module.exports = {
  improve: improve,
  dev: function(config) {
    improve(config);

    config.output = config.output || {};

    config.devtool = 'eval-source-map';

    config.output.pathinfo = true;

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development')
        }
      })
    );
  },
  prod: function(config) {
    improve(config);

    config.devtool = 'source-map';

    config.plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production')
        }
      })
    );
  }
};