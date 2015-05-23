'use strict';

var _ = require('lodash');
var Wrapper = require('./Wrapper');
var Cache = require('./Cache');

var wrappers = {
  wrappers: [],
  find: function(opts) {
    return _.find(this.wrappers, function(obj) {
      return _.isEqual(obj.opts, opts);
    });
  },
  add: function(obj) {
    this.wrappers.push(obj);
  },
  clear: function() {
    this.wrappers = [];
  }
};

var caches = {
  caches: Object.create(null),
  add: function(key, cache) {
    return this.caches[key] = cache;
  },
  get: function(key) {
    return this.caches[key];
  },
  clear: function() {
    this.caches = Object.create(null);
  }
};

var defaultCacheTTL = 1000 * 60 * 60 * 24 * 30; // 30 days

var webpackWrapper = function webpackWrapper(opts, cb) {
  if (opts.logger === undefined) {
    // js-host hook
    if (this && this.host && this.host.logger) {
      opts.logger = this.host.logger;
    } else {
      opts.logger = console;
    }
  }

  var cacheTTL = opts.cacheTTL;
  if (cacheTTL === undefined) {
    cacheTTL = defaultCacheTTL;
  }

  var cache;
  if (opts.cacheFile) {
    opts.useMemoryFS = false;

    var cacheFile = opts.cacheFile;

    cache = caches.get(cacheFile);
    if (!cache) {
      cache = caches.add(cacheFile, new Cache(cacheFile, cacheTTL, opts.logger));
    }
  }

  opts = Wrapper.prototype.generateOptions(opts);

  var wrapper = wrappers.find(opts);

  if (!wrapper) {
    wrapper = new Wrapper(opts, null, cache);
    wrappers.add(wrapper);
  }

  if (opts.config && cache && !cache.updated[opts.config]) {
    cache.get(opts.config, function(err, entry) {
      if (err || !entry) {
        return wrapper.onceDone(cb);
      }

      if (opts.logger) {
        opts.logger.info('Webpack: serving cached output for ' + opts.config);
      }

      cb(null, entry.stats);

      if (opts.watch) {
        // Start the compiler in the background
        wrapper.onceDone(function(){/* no-op */});
      }
    });
  } else {
    wrapper.onceDone(cb);
  }

  return wrapper;
};

// Exposed for the test suite
webpackWrapper._wrappers = wrappers;
webpackWrapper._caches = caches;
webpackWrapper._defaultCacheTTL = defaultCacheTTL;

module.exports = webpackWrapper;