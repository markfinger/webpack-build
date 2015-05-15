'use strict';

var _ = require('lodash');
var Bundle = require('./Bundle');

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

var webpackWrapper = function webpackWrapper(opts, cb) {
  // js-host hook to pass the logger to the bundles
  if (this && this.host && this.host.logger) {
    opts.logger = this.host.logger;
  }

  opts = Bundle.prototype.generateOptions(opts);

  var bundle = bundles.find(opts);

  if (!bundle) {
    bundle = new Bundle(opts);
    bundles.add(bundle);
  }

  bundle.onceDone(function(err, stats) {
    if (err) return cb(err);

    var statsJson = stats.toJson({
      modules: false,
      source: false
    });

    statsJson.pathsToAssets = stats.pathsToAssets;

    cb(null, statsJson);
  });

  return bundle
};

webpackWrapper._bundles = bundles;

module.exports = webpackWrapper;