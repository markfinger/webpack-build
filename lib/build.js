'use strict';

var Wrapper = require('./Wrapper');
var Cache = require('./Cache');
var options = require('./options');
var _logger = require('./logger');

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
      this.caches[opts.cacheFile] = new Cache(opts);
    }

    return this.caches[opts.cacheFile];
  },
  clear: function() {
    this.caches = Object.create(null);
  }
};

var build = function build(opts, cb) {
  opts = options.generate(opts);

  var logger = _logger('build', opts);

  var cache;
  if (opts.cache) {
    logger('cache enabled');
    cache = caches.get(opts);
  }

  var wrapper = wrappers.get(opts);

  if (!wrapper) {
    wrapper = new Wrapper(opts, null, cache);
    wrappers.add(wrapper);
    logger('wrapper created');
  }

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(function() {
    if (!cache || cache.delegate) {
      if (cache.delegate) {
        logger('cache has delegated to wrapper');
      }
      wrapper.onceDone(cb);
    } else {
      logger('requesting data from cache');
      cache.get(function(err, data) {
        if (err) {
          logger('cache error', err.message);
        }

        if (err || !data) {
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
          wrapper.onceDone(function(){/* no-op */});
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

module.exports = build;