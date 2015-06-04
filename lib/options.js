'use strict';

var crypto = require('crypto');
var path = require('path');
var _ = require('lodash');
var packageJson = require('../package');

module.exports = {
  defaults: {
    // Configurable
    config: '',
    watch: false,
    aggregateTimeout: 200,
    poll: undefined,
    env: '',
    outputPath: '',
    publicPath: '',
    staticRoot: '',
    staticUrl: '',
    cache: true,
    cacheDir: path.join(process.cwd(), '.webpack_cache'),
    hmr: false,
    hmrRoot: '',
    hmrPath: '/__webpack_hmr__',
    hmrNamespace: '',

    // Generated
    hash: '',
    cacheFile: ''
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
      var serializable = _.omit(opts, _.isObject);
      var json = JSON.stringify(serializable);
      var content = json + packageJson.version;
      opts.hash = crypto.createHash('md5').update(content).digest('hex');
    }

    if (!opts.cacheFile) {
      opts.cacheFile = path.join(opts.cacheDir, opts.hash + '.json');
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
