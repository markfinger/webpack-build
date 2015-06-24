'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

exports['default'] = {
  config: '',

  // Watching
  watch: false,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  outputPath: '',
  publicPath: '',

  // External system integration
  staticRoot: '',
  staticUrl: '',

  // Caching
  cache: true,
  cacheDir: _path2['default'].join(process.cwd(), '.webpack_build_cache'),

  // Hot module replacement
  hmr: false,
  hmrRoot: '',
  hmrPath: '/__hmr__',

  // Dynamically created props
  buildHash: '',
  cacheFile: '',
  hmrNamespace: ''
};
module.exports = exports['default'];
//# sourceMappingURL=defaults.js.map