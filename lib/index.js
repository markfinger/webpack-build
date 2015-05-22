'use strict';

var _ = require('lodash');
var Bundle = require('./Bundle');
var Cache = require('./Cache');

var bundles = {
  bundles: [],
  find: function(opts) {
    return _.find(this.bundles, function(obj) {
      return _.isEqual(obj.opts, opts);
    });
  },
  add: function(obj) {
    this.bundles.push(obj);
  },
  clear: function() {
    this.bundles = [];
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

  var cacheTTL = opts.cacheTTL || defaultCacheTTL;

  var cache;
  if (opts.cacheFile) {
    opts.useMemoryFS = false;

    var cacheFile = opts.cacheFile;

    cache = caches.get(cacheFile);
    if (!cache) {
      cache = caches.add(cacheFile, new Cache(cacheFile, cacheTTL, opts.logger));
    }
  }

  opts = Bundle.prototype.generateOptions(opts);

  var bundle = bundles.find(opts);

  if (!bundle) {
    bundle = new Bundle(opts, null, cache);
    bundles.add(bundle);
  }

  if (opts.config && cache && !cache.updated[opts.config]) {
    cache.get(opts.config, function(err, entry) {
      if (err || !entry) {
        return bundle.onceDone(cb);
      }

      if (opts.watch) {
        // Start the compiler in the background
        bundle.onceDone(function(){/* no-op */});
      }

      if (opts.logger) {
        opts.logger.info('Webpack: serving cached output for ' + opts.config);
      }

      cb(null, entry.stats);
    });
  } else {
    bundle.onceDone(cb);
  }

  return bundle;
};

// Exposed for the test suite
webpackWrapper._bundles = bundles;
webpackWrapper._caches = caches;
webpackWrapper._defaultCacheTTL = defaultCacheTTL;

module.exports = webpackWrapper;