'use strict';

var Wrapper = require('./Wrapper');
var Cache = require('./Cache');
var options = require('./options');

var wrappers = {
  wrappers: Object.create(null),
  find: function(opts) {
    return this.wrappers[opts.hash];
  },
  add: function(wrapper) {
    this.wrappers[wrapper.opts.hash] = wrapper;
  },
  clear: function() {
    this.wrappers = Object.create(null);
  }
};

var caches = {
  caches: Object.create(null),
  add: function(key, cache) {
    this.caches[key] = cache;
  },
  get: function(key) {
    return this.caches[key];
  },
  clear: function() {
    this.caches = Object.create(null);
  }
};

var webpackWrapper = function webpackWrapper(opts, cb) {
  if (opts.logger === undefined) {
    // js-host hook
    if (this && this.host && this.host.logger) {
      opts.logger = this.host.logger;
    } else {
      opts.logger = console;
    }
  }

  opts = options.generate(opts);

  var cache;

  if (opts.cacheFile) {
    cache = caches.get(opts.cacheFile);
    if (!cache) {
      cache = new Cache(opts.cacheFile, opts.cacheTTL, opts.logger);
      caches.add(opts.cacheFile, cache);
    }
  }

  var wrapper = wrappers.find(opts);

  if (!wrapper) {
    wrapper = new Wrapper(opts, null, cache);
    wrappers.add(wrapper);
  }

  if (!cache || cache.updated[opts.cacheKey]) {
    wrapper.onceDone(cb);
  } else {
    cache.get(opts.cacheKey, function(err, entry) {
      if (err && opts.logger) {
        opts.logger.error('Webpack: cache error', err.stack);
      }

      if (err || !entry) {
        return wrapper.onceDone(cb);
      }

      if (entry.optsHash && entry.optsHash !== opts.hash) {
        if (opts.logger) {
          opts.logger.info('Webpack: differing options hash for cache entry "' + opts.cacheKey + '"');
        }
        cache.set(opts.cacheKey, undefined);
        return wrapper.onceDone(cb);
      }

      if (opts.logger) {
        opts.logger.info('Webpack: serving cached output for key "' + opts.cacheKey + '" in cache file ' + opts.cacheFile);
      }

      cb(null, entry.stats);

      if (opts.watch && !wrapper.isWatching) {
        // Start the watcher
        process.nextTick(function() {
          wrapper.onceDone(function(){/* no-op */});
        });
      }
    });
  }

  return wrapper;
};

// Exposed for the test suite
webpackWrapper._wrappers = wrappers;
webpackWrapper._caches = caches;

module.exports = webpackWrapper;