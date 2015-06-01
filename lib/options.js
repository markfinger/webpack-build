'use strict';

var crypto = require('crypto');
var _ = require('lodash');

module.exports = {
  defaults: {
    config: null,
    watch: false,
    aggregateTimeout: 200,
    poll: undefined,
    watchConfig: false,
    outputPath: null,
    builds: null,
    staticRoot: null,
    staticUrl: null,
    cacheFile: null,
    cacheKey: null,
    socketRoot: null,
    socketPath: null,
    socketNamespace: null,
    hash: null,
    cacheTTL: 1000 * 60 * 60 * 24 * 30, // 30 days
    logger: null
  },
  generate: function(opts) {
    opts = opts || {};

    opts = _.defaults(opts, this.defaults);

    if (!opts.hash) {
      var serializable = _.omit(opts, 'logger');
      var json = JSON.stringify(serializable);
      opts.hash = crypto.createHash('md5').update(json).digest('hex');
    }

    if (!opts.cacheKey && _.isString(opts.config)) {
      opts.cacheKey = opts.config + '__' + opts.hash;
    }

    if (opts.socketRoot && _.endsWith(opts.socketRoot, '/')) {
      opts.socketRoot = opts.socketRoot.slice(0, -1);
    }

    if (!opts.socketPath) {
      opts.socketPath = '/webpack_wrapper';
    }

    if (!opts.socketNamespace) {
      opts.socketNamespace = '/webpack_wrapper__' + opts.hash;
    }

    return opts;
  }
};
