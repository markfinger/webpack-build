'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _hmr = require('./hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _env = require('./env');

var _env2 = _interopRequireDefault(_env);

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _Wrapper = require('./Wrapper');

var _Wrapper2 = _interopRequireDefault(_Wrapper);

var _wrappers = require('./wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _cache = require('./cache');

var _cache2 = _interopRequireDefault(_cache);

var build = function build(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('build', opts);

  var wrapper = _wrappers2['default'].get(opts);
  if (!wrapper) {
    logger('creating wrapper');
    wrapper = new _Wrapper2['default'](opts);
  }

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(function () {
    logger('requesting data from cache');
    _cache2['default'].get(opts, function (err, data) {
      if (err) {
        logger('cache produced an error', err.message);
      }

      if (!data) {
        logger('cache failed to provide data, calling wrapper');
        return wrapper.onceDone(cb);
      }

      if (opts.watch) {
        logger('Ensuring watcher has started');
        wrapper.onceDone(function () {});
      }

      logger('serving cached output');
      return cb(null, data);
    });
  });

  return wrapper;
};

build.wrappers = _wrappers2['default'];
build.hmr = _hmr2['default'];
build.env = _env2['default'];

exports['default'] = build;
module.exports = exports['default'];
/* no-op */
//# sourceMappingURL=build.js.map