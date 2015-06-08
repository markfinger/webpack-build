'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _Wrapper = require('./Wrapper');

var _Wrapper2 = _interopRequireDefault(_Wrapper);

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _collections = require('./collections');

var wrappers = new _collections.Wrappers();
var caches = new _collections.Caches();

var build = function build(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('build', opts);

  var cache = undefined;
  if (opts.cache) {
    logger('cache enabled');
    cache = caches.get(opts);
  }

  var wrapper = wrappers.get(opts, cache);

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(function () {
    if (!cache || cache.delegate) {
      if (cache.delegate) {
        logger('cache has delegated to wrapper');
      }

      wrapper.onceDone(cb);
    } else {
      logger('requesting data from cache');

      cache.get(function (err, data) {
        if (err) {
          logger('cache error', err.message);
          return wrapper.onceDone(cb);
        }

        if (!data) {
          logger('cache failed to provide data, calling wrapper');
          return wrapper.onceDone(cb);
        }

        if (data.hash !== opts.hash) {
          logger('cached hash "' + data.hash + '" does not match the expected');

          cache.set(null);
          return wrapper.onceDone(cb);
        }

        if (opts.watch && !wrapper.isWatching) {
          logger('starting watcher');

          // Start the watcher
          wrapper.onceDone(function () {});
        }

        logger('serving cached output');

        cb(null, data.stats);
      });
    }
  });

  return wrapper;
};

build.wrappers = wrappers;
build.caches = caches;

exports['default'] = build;
module.exports = exports['default'];
/* no-op */
//# sourceMappingURL=build.js.map