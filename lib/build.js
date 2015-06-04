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
  get: function(opts) {
    if (!this.caches[opts.cacheFile]) {
      this.caches[opts.cacheFile] = new Cache(opts.cacheFile, opts.logger);
    }

    return this.caches[opts.cacheFile];
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
  if (opts.cache) {
    cache = caches.get(opts);
  }

  var wrapper = wrappers.get(opts);

  if (!wrapper) {
    wrapper = new Wrapper(opts, null, cache);
    wrappers.add(wrapper);
  }

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(function() {
    if (!cache || cache.delegate) {
      wrapper.onceDone(cb);
    } else {
      cache.get(function(err, data) {
        if (err && opts.logger) {
          opts.logger.error('Webpack: cache error', err.stack);
        }

        if (err || !data) {
          return wrapper.onceDone(cb);
        }

        // TODO: there _should_ always be an optsHash prop
        if (data.optsHash && data.optsHash !== opts.hash) {
          if (opts.logger) {
            opts.logger.info('Webpack: differing options hash for cache file "' + opts.cacheFile + '"');
          }
          cache.set(opts.cacheKey, undefined);
          return wrapper.onceDone(cb);
        }

        if (opts.logger) {
          opts.logger.info('Webpack: serving cached output from cache file "' + opts.cacheFile);
        }

        if (opts.watch && !wrapper.isWatching) {
          // Start the watcher
          wrapper.onceDone(function(){/* no-op */});
        }

        cb(null, data.stats);
      });
    }
  });

  return wrapper;
};

build.wrappers = wrappers;
build.caches = caches;

module.exports = build;