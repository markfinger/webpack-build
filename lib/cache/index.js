'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _caches = require('./caches');

var _caches2 = _interopRequireDefault(_caches);

exports['default'] = {
  get: function get(opts, cb) {
    if (!opts.cache) return cb();

    var cache = _caches2['default'].get(opts);

    if (cache.delegate) {
      cache.logger('delegating');
      return cb();
    }

    cache.get(function (err, data) {
      if (err) {
        return cb(err);
      }

      if (!data) {
        return cb();
      }

      if (data.buildHash !== opts.buildHash) {
        cache.logger('cached build hash "' + data.buildHash + '" does not match "' + opts.buildHash + '"');
        cache.set(null);
        return cb();
      }

      cb(null, data);
    });
  },
  set: function set(opts, data) {
    if (!opts.cache) return;

    var delegate = opts.watch;
    var cache = _caches2['default'].get(opts);
    cache.set(data, delegate);
  }
};
module.exports = exports['default'];
//# sourceMappingURL=index.js.map