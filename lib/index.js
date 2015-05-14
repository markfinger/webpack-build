var Bundle = require('./Bundle');
var cache = require('./cache');

module.exports = function webpackService(opts, cb) {
  if (this.host && this.host.logger) {
    opts.logger = this.host.logger;
  }

  opts = Bundle.prototype.generateOptions(opts);

  var bundle = cache.find(opts);

  if (!bundle) {
    bundle = new Bundle(opts);
    cache.add(bundle);
  }

  bundle.onceDone(cb);

  return bundle
};