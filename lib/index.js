var Bundle = require('./Bundle');
var cache = require('./cache');

module.exports = function webpackService(opts, cb) {
  opts = Bundle.prototype.generateOptions(opts);

  var bundle = cache.find(opts);

  if (!bundle) {
    bundle = new Bundle(opts);
    cache.add(bundle);
  }

  bundle.onceDone(cb);
};