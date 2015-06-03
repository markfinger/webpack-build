'use strict';

var Wrapper = require('./Wrapper');
var Cache = require('./Cache');
var options = require('./options');

var wrappers = {
  wrappers: Object.create(null),
  add: function(wrapper) {
    this.wrappers[wrapper.opts.hash] = wrapper;
  },
  get: function(opts) {
    return this.wrappers[opts.hash];
  },
  clear: function() {
    this.wrappers = Object.create(null);
  }
};

var caches = {
  caches: Object.create(null),
  add: function(opts, cache) {
    this.caches[opts.cacheKey] = cache;
  },
  get: function(opts) {
    return this.caches[opts.cacheKey];
  },
  clear: function() {
    this.caches = Object.create(null);
  }
};

var build = function build(opts, cb) {
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
    cache = caches.get(opts);
    if (!cache) {
      cache = new Cache(opts.cacheFile, opts.logger);
      caches.add(opts, cache);
    }
  }

  var wrapper = wrappers.get(opts);

  if (!wrapper) {
    wrapper = new Wrapper(opts, null, cache);
    wrappers.add(wrapper);
  }

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(function() {
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

        if (opts.watch && !wrapper.isWatching) {
          // Start the watcher
          wrapper.onceDone(function(){/* no-op */});
        }

        cb(null, entry.stats);
      });
    }
  });

  return wrapper;
};

build.wrappers = wrappers;
build.caches = caches;

module.exports = build;