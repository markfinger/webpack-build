'use strict';

var crypto = require('crypto');
var path = require('path');
var _ = require('lodash');

module.exports = {
  defaults: {
    config: null,
    watch: false,
    aggregateTimeout: 200,
    poll: undefined,
    outputPath: null,
    publicPath: null,
    env: null,
    staticRoot: null,
    staticUrl: null,
    cache: true,
    cacheDir: path.join(process.cwd(), '.webpack_cache'),
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

    if (!opts.cacheKey) {
      opts.cacheKey = opts.hash;

      if (_.isString(opts.config)) {
        opts.cacheKey = opts.config + '__' + opts.cacheKey;
      }
    }

    if (!opts.cacheFile) {
      opts.cacheFile = opts.cacheKey;

      if (_.startsWith(process.cwd(), opts.cacheFile)) {
        opts.cacheFile = opts.cacheFile.slice(process.cwd().length);
      }

      opts.cacheFile = opts.cacheFile.split(path.sep).join('_') + '.json';

      opts.cacheFile = path.join(opts.cacheDir, opts.cacheFile);
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
