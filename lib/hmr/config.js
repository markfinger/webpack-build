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

  if (!opts.outputPath && (!config.output || !config.output.path)) {
    throw new Error('the output.path prop must be defined in your config or as the outputPath option to inject the hmr runtime');
  }

  if (!opts.publicPath && (!config.output.publicPath || !config.output.publicPath)) {
    throw new Error('the output.publicPath prop must be defined in your config or as the publicPath option to inject the hmr runtime');
  }

  var socketOpts = JSON.stringify({
    root: opts.hmrRoot,
    path: opts.hmrPath,
    namespace: opts.hmrNamespace
  });

  var devClient = [__dirname + '/client?' + socketOpts, 'webpack/hot/only-dev-server'];

  config.entry = config.entry || [];

  if (_lodash2['default'].isArray(config.entry)) {
    config.entry = devClient.concat(config.entry);
  } else if (_lodash2['default'].isObject(config.entry)) {
    _lodash2['default'].forEach(config.entry, function (value, key) {
      config.entry[key] = devClient.concat(value);
    });
  } else {
    config.entry = devClient.concat([config.entry]);
  }

  config.plugins = config.plugins || [];

  config.plugins.push(new _webpack2['default'].HotModuleReplacementPlugin());

  config.output = config.output || {};

  if (opts.publicPath) {
    config.output.publicPath = opts.publicPath;
  }

  var outputPath = opts.outputPath || config.output.path;
  config.recordsPath = _path2['default'].join(outputPath, 'webpack.records-' + opts.buildHash + '.json');
};

exports['default'] = hmrConfig;
module.exports = exports['default'];
//# sourceMappingURL=config.js.map