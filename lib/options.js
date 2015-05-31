'use strict';

var crypto = require('crypto');
var _ = require('lodash');

module.exports = {
  defaults: {
    config: null,
    watch: false,
    aggregateTimeout: 200,
    poll: undefined,
    useMemoryFS: true,
    watchConfig: false,
    outputPath: null,
    build: null,
    staticRoot: null,
    staticUrl: null,
    cacheFile: null,
    cacheKey: null,
    cacheTTL: 1000 * 60 * 60 * 24 * 30, // 30 days
    logger: null,
    hash: null
  },
  generate: function(opts) {
    opts = opts || {};

    opts = _.defaults(opts, this.defaults);

    if (opts.cacheFile) {
      opts.useMemoryFS = false;
    }

    if (!opts.hash) {
      var serializable = _.omit(opts, 'logger');
      var json = JSON.stringify(serializable);
      opts.hash = crypto.createHash('md5').update(json).digest('hex');
    }

    if (!opts.cacheKey && _.isString(opts.config)) {
      opts.cacheKey = opts.config + '__' + opts.hash;
    }

    return opts;
  }
};
