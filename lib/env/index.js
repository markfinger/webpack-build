'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var improve = function improve(config) {
  config.plugins = config.plugins || [];

  config.plugins.push(new _webpack2['default'].optimize.OccurrenceOrderPlugin(), new _webpack2['default'].NoErrorsPlugin());
};

module.exports = {
  dev: function dev(config) {
    improve(config);

    config.output = config.output || {};

    config.devtool = 'eval-source-map';

    config.output.pathinfo = true;

    config.plugins.push(new _webpack2['default'].DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development')
      }
    }));
  },
  prod: function prod(config) {
    improve(config);

    config.devtool = 'source-map';

    config.plugins.push(new _webpack2['default'].optimize.DedupePlugin(), new _webpack2['default'].optimize.UglifyJsPlugin(), new _webpack2['default'].DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }));
  }
};
//# sourceMappingURL=index.js.map