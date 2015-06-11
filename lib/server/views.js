'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _build = require('../build');

var _build2 = _interopRequireDefault(_build);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

var _cacheCaches = require('../cache/caches');

var _cacheCaches2 = _interopRequireDefault(_cacheCaches);

var _wrappers = require('../wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var index = function index(req, res) {
  var title = 'webpack-build-server v' + _package2['default'].version;

  var wrapperList = _lodash2['default'].map(_wrappers2['default'].wrappers, function (wrapper, key) {
    return '<li>' + key + ' &mdash; ' + JSON.stringify(wrapper.opts, null, 2) + '</li>';
  });
  var cacheList = _lodash2['default'].map(_cacheCaches2['default'].caches, function (cache, key) {
    return '\n    <li>\n      ' + key + ' &mdash; ' + JSON.stringify(cache, null, 2) + '\n    </li>\n    ';
  });
  res.end('\n  <html>\n  <head>\n    <title>' + title + '</title>\n  </head>\n  <body>\n    <h1>' + title + '</h1>\n    <h2>Default options</h2>\n    <pre>' + JSON.stringify(_optionsDefaults2['default'], null, 2) + '</pre>\n    <h2>Wrappers</h2>\n    <ul>' + wrapperList + '</ul>\n    <h2>Caches</h2>\n    <ul>' + cacheList + '</ul>\n  </body>\n  </html>\n  ');
};

exports.index = index;
var buildRequest = function buildRequest(req, res) {
  var opts = (0, _options2['default'])(req.body);
  (0, _build2['default'])(opts, function (err, data) {
    if (err) {
      (0, _log2['default'])('build-server', opts)('build request produced an error', err.stack);
    }

    res.json({
      error: err ? err.stack : null,
      data: data || null
    });
  });
};
exports.buildRequest = buildRequest;
//# sourceMappingURL=views.js.map