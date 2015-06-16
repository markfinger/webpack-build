'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _caches = require('./caches');

var _caches2 = _interopRequireDefault(_caches);

exports['default'] = {
  get: function get(opts, cb) {
    // Sanity check
    if (_cluster2['default'].isWorker) {
      throw new Error('Workers should not fetch from the cache');
    }

    var logger = (0, _log2['default'])('cache-manager', opts);

    if (!opts.cache) {
      logger('cache deactivated');
      return cb(null, null);
    }

    logger('fetching cache');
    var cache = _caches2['default'].get(opts);

    if (cache.delegate) {
      logger('cache has delegated');
      return cb(null, null);
    }

    logger('requesting data from cache');
    cache.get(function (err, data) {
      if (err) {
        logger('cache encountered an error, passing error up');
        return cb(err, null);
      }

      if (!data) {
        logger('cache failed to provide data');
        return cb(null, null);
      }

      if (data.buildHash !== opts.buildHash) {
        logger('cached build hash "' + data.buildHash + '" does not match "' + opts.buildHash + '"');
        cache.set(null);
        return cb(null, null);
      }

      logger('providing cached data');
      cb(null, data);
    });
  },
  set: function set(opts, data) {
    var logger = (0, _log2['default'])('cache-manager', opts);

    if (_cluster2['default'].isWorker) {
      logger('sending cache signal to master process');
      return process.send({
        type: 'cache',
        data: {
          opts: opts,
          cacheData: data
        }
      });
    }

    if (!opts.cache) {
      logger('caching has been deactivated, data will not be persisted');
      return;
    }

    var delegate = opts.watch;

    logger('fetching cache');
    var cache = _caches2['default'].get(opts);

    if (delegate && !cache.delegate) {
      logger('cache will now delegate future requests');
    }

    logger('updating cache');
    cache.set(data, delegate);
  },
  clear: function clear() {
    // Purges the memory cache, but leaves the file system intact
    _caches2['default'].clear();
  },
  _caches: _caches2['default']
};
module.exports = exports['default'];
//# sourceMappingURL=index.js.map