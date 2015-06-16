'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

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

var _cache = require('../cache');

var _cache2 = _interopRequireDefault(_cache);

var _utilsProcess_data = require('../utils/process_data');

var _utilsProcess_data2 = _interopRequireDefault(_utilsProcess_data);

var _workers = require('../workers');

var _workers2 = _interopRequireDefault(_workers);

var _hmr = require('../hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var app = (0, _express2['default'])();
var server = _http2['default'].Server(app);

app.use(_bodyParser2['default'].json());
app.use(middleware);

app.get('/', function (req, res) {
  var title = 'webpack-build-server v' + _package2['default'].version;

  var wrapperList = _lodash2['default'].map(_wrappers2['default'].wrappers, function (wrapper, key) {
    return '<li>' + key + ' &mdash; ' + JSON.stringify(wrapper.opts, null, 2) + '</li>';
  });
  var cacheList = _lodash2['default'].map(_cacheCaches2['default'].caches, function (cache, key) {
    return '\n    <li>\n      ' + key + ' &mdash; ' + JSON.stringify(cache, null, 2) + '\n    </li>\n    ';
  });
  res.end('\n  <html>\n  <head>\n    <title>' + title + '</title>\n  </head>\n  <body>\n    <h1>' + title + '</h1>\n    <h2>Default options</h2>\n    <pre>' + JSON.stringify(_optionsDefaults2['default'], null, 2) + '</pre>\n    <h2>Wrappers</h2>\n    <ul>' + wrapperList + '</ul>\n    <h2>Caches</h2>\n    <ul>' + cacheList + '</ul>\n  </body>\n  </html>\n  ');
});

app.post('/', function (req, res) {
  var opts = (0, _options2['default'])(req.body);
  var logger = (0, _log2['default'])('build-server', opts);

  var workerOpts = _lodash2['default'].cloneDeep(opts);
  workerOpts.cache = false;

  // TODO fix hmr
  // TODO prevent workers from accessing the cache

  var emit = function emit(err, data) {
    if (err) {
      logger('error encountered during build', err);
      return res.status(500).end(err.stack);
    } else {
      logger('serving data from build');
      return res.json(data);
    }
  };

  logger('checking cache');
  _cache2['default'].get(opts, function (err, cachedData) {
    if (err) {
      logger('cache error: ' + err);
    }

    if (cachedData) {
      logger('cached data received');
      emit(null, (0, _utilsProcess_data2['default'])(null, cachedData));
    } else {
      logger('cache has no matching data or has delegated, calling worker');
    }

    if (!cachedData || opts.watch) {
      logger('submitting build request to worker');
      send(workerOpts, function (err, data) {
        logger('populating cache');
        if (err) logger('worker error: ' + err);

        if (data) {
          var buildError = data.error;
          var buildData = data.data;

          if (buildError) {
            logger('worker build error: ' + buildError);
            _cache2['default'].set(opts, null);
          } else {
            _cache2['default'].set(opts, buildData, opts.watch);
          }
        }

        if (!cachedData) {
          emit(err, data);
        }
      });
    }
  });
});

_hmr2['default'].addToServer(server);

exports['default'] = server;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map