'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _wrappers = require('./wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _cache = require('./cache');

var _cache2 = _interopRequireDefault(_cache);

var build = function build(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('build', opts);
  logger('build request lodged for ' + opts.config);

  var wrapper = _wrappers2['default'].get(opts);

  // Defer so that we can return the wrapper before `cb` is called
  // This adds a tiny overhead, but makes testing much easier to
  // reason about
  process.nextTick(function () {
    logger('requesting data from cache');
    _cache2['default'].get(opts, function (err, data) {
      if (err) {
        logger('cache produced an error', err.message);
      }

      if (!data) {
        logger('cache failed to provide data, calling wrapper');
        return wrapper.onceDone(cb);
      }

      if (opts.watch) {
        logger('Ensuring watcher has started');
        wrapper.onceDone(function () {});
      }

      logger('serving cached output');
      return cb(null, data);
    });
  });

  return wrapper;
};

exports['default'] = build;
module.exports = exports['default'];
/* no-op */
//# sourceMappingURL=build.js.map