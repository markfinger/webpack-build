'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var hmrConfig = function hmrConfig(config, opts) {
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

  var devClient = ['webpack-build/lib/hmr/client?' + socketOpts,
  // TODO: replace?
  'webpack/hot/only-dev-server'];

  config.entry = config.entry || [];

  if (_lodash2['default'].isArray(config.entry)) {
    config.entry = devClient.concat(config.entry);
  } else if (_lodash2['default'].isObject(config.entry)) {
    _lodash2['default'].forEach(config.entry).forEach(function (value, key) {
      config.entry[key] = devClient.concat(value);
    });
  } else {
    config.entry = devClient.concat([config.entry]);
  }

  config.plugins = config.plugins || [];

  config.plugins.push(new _webpack2['default'].HotModuleReplacementPlugin());

  config.output = config.output || {};

  config.output.publicPath = opts.publicPath;

  config.recordsPath = _path2['default'].join(opts.outputPath, 'webpack.records-' + opts.hash + '.json');
};

exports['default'] = hmrConfig;
module.exports = exports['default'];
//# sourceMappingURL=config.js.map