'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _caches = require('./caches');

var _caches2 = _interopRequireDefault(_caches);

var _workers = require('./workers');

var _workers2 = _interopRequireDefault(_workers);

var _compile = require('./compile');

var _compile2 = _interopRequireDefault(_compile);

var build = function build(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('build', opts);
  logger('build ' + opts.buildHash + ' requested');

  var emit = function emit(err, data) {
    if (err) logger('error encountered during build', err);else logger('serving data from build');

    cb(err, data);
  };

  logger('requesting data from caches');
  _caches2['default'].get(opts, function (err, data) {
    if (err) {
      logger('cache produced an error', err.message);
    }

    if (data) {
      logger('cached data received');
      emit(null, data);
    } else {
      logger('cache has no matching data or has delegated');
    }

    if (!data) {
      if (_workers2['default'].available()) {
        logger('Requesting build from workers');
        _workers2['default'].build(opts, emit);
      } else {
        logger('Requesting build from compile');
        (0, _compile2['default'])(opts, emit);
      }
    } else if (opts.watch) {
      logger('Ensuring compiler is running in the background');

      var noop = function noop() {/* no-op */};
      if (_workers2['default'].available()) {
        _workers2['default'].build(opts, noop);
      } else {
        (0, _compile2['default'])(opts, noop);
      }
    }
  });
};

exports['default'] = build;
module.exports = exports['default'];
//# sourceMappingURL=build.js.map