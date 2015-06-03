'use strict';

var crypto = require('crypto');
var _ = require('lodash');

module.exports = {
  defaults: {
    config: null,
    watch: false,
    aggregateTimeout: 200,
    poll: undefined,
    outputPath: null,
    publicPath: null,
    build: null,
    staticRoot: null,
    staticUrl: null,
    cacheFile: null,
    cacheKey: null,
    hmr: false,
    hmrRoot: null,
    hmrPath: '/__webpack_hmr__',
    hmrNamespace: null,
    hash: null,
    logger: null
  },
  generate: function(opts) {
    opts = opts || {};

    opts = _.defaults(opts, this.defaults);

    if (opts.staticUrl && !_.endsWith(opts.staticUrl, '/')) {
      opts.staticUrl += '/';
    }

    if (opts.publicPath && !_.endsWith(opts.publicPath, '/')) {
      opts.publicPath += '/';
    }

    if (!opts.hash) {
      var serializable = _.omit(opts, 'logger');
      var json = JSON.stringify(serializable);
      opts.hash = crypto.createHash('md5').update(json).digest('hex');
    }

    if (!opts.cacheKey && _.isString(opts.config)) {
      opts.cacheKey = opts.config + '__' + opts.hash;
    }

    if (opts.hmrRoot && _.endsWith(opts.hmrRoot, '/')) {
      opts.hmrRoot = opts.hmrRoot.slice(0, -1);
    }

    if (!opts.hmrNamespace) {
      opts.hmrNamespace = '/' + opts.hash;
    }

    return opts;
  }
};
