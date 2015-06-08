'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

exports['default'] = function (opts) {
  opts = opts || {};

  opts = _lodash2['default'].defaults(opts, _defaults2['default']);

  if (opts.staticUrl && !_lodash2['default'].endsWith(opts.staticUrl, '/')) {
    opts.staticUrl += '/';
  }

  if (opts.publicPath && !_lodash2['default'].endsWith(opts.publicPath, '/')) {
    opts.publicPath += '/';
  }

  if (!opts.hash) {
    var serializable = _lodash2['default'].omit(opts, _lodash2['default'].isObject);
    var json = JSON.stringify(serializable);
    var content = json + _package2['default'].version;
    opts.hash = _crypto2['default'].createHash('md5').update(content).digest('hex');
  }

  if (!opts.cacheFile) {
    opts.cacheFile = _path2['default'].join(opts.cacheDir, opts.hash + '.json');
  }

  if (opts.hmrRoot && _lodash2['default'].endsWith(opts.hmrRoot, '/')) {
    opts.hmrRoot = opts.hmrRoot.slice(0, -1);
  }

  if (!opts.hmrNamespace) {
    opts.hmrNamespace = '/' + opts.hash;
  }

  return opts;
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map