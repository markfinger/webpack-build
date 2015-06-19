'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _build2 = require('../build');

var _build3 = _interopRequireDefault(_build2);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

var _cachesCaches = require('../caches/caches');

var _cachesCaches2 = _interopRequireDefault(_cachesCaches);

var _wrappers = require('../wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _utilsProcess_data = require('../utils/process_data');

var _utilsProcess_data2 = _interopRequireDefault(_utilsProcess_data);

exports['default'] = {
  index: function index(req, res) {
    var title = 'webpack-build-server v' + _package2['default'].version;

    var wrapperList = _lodash2['default'].map(_wrappers2['default'].wrappers, function (wrapper, key) {
      return '<li>' + key + ' &mdash; ' + JSON.stringify(wrapper.opts, null, 2) + '</li>';
    });
    var cacheList = _lodash2['default'].map(_cachesCaches2['default'].caches, function (cache, key) {
      return '\n        <li>\n          ' + key + ' &mdash; ' + JSON.stringify(cache, null, 2) + '\n        </li>\n      ';
    });
    res.end('\n      <html>\n      <head>\n        <title>' + title + '</title>\n      </head>\n      <body>\n        <h1>' + title + '</h1>\n        <h2>Default options</h2>\n        <pre>' + JSON.stringify(_optionsDefaults2['default'], null, 2) + '</pre>\n        <h2>Wrappers</h2>\n        <ul>' + wrapperList + '</ul>\n        <h2>Caches</h2>\n        <ul>' + cacheList + '</ul>\n      </body>\n      </html>\n    ');
  },
  build: function build(req, res) {
    var opts = (0, _options2['default'])(req.body);
    var logger = (0, _log2['default'])('build-server', opts);
    logger('request received for ' + opts.buildHash);

    (0, _build3['default'])(opts, function (err, data) {
      res.json((0, _utilsProcess_data2['default'])(err, data));
    });
  }
};
module.exports = exports['default'];
//# sourceMappingURL=endpoints.js.map