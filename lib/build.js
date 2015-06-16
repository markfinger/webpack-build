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

var _wrappers = require('./wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _caches = require('./caches');

var _caches2 = _interopRequireDefault(_caches);

var _utilsCheck_config_file = require('./utils/check_config_file');

var _utilsCheck_config_file2 = _interopRequireDefault(_utilsCheck_config_file);

var _workers = require('./workers');

var _workers2 = _interopRequireDefault(_workers);

var compile = function compile(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('compile', opts);
  logger('build ' + opts.buildHash + ' requested');

  // Ensure that the imported version of the config file is fresh
  logger('checking timestamps on ' + opts.config);
  var configErr = (0, _utilsCheck_config_file2['default'])(opts.config, cb);
  if (configErr) {
    logger('error encountered when checking timestamps on ' + opts.config, configErr.stack);
    return cb(configErr);
  }

  var wrapper = _wrappers2['default'].get(opts);
  wrapper.onceDone(cb);
};

exports.compile = compile;
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
      logger('cache has no matching data or has delegated, passing to compiler');
    }

    if (!data) {
      if (_workers2['default'].available()) {
        logger('Requesting build from workers');
        _workers2['default'].build(opts, emit);
      } else {
        logger('Requesting build from compile');
        compile(opts, emit);
      }
    } else if (opts.watch) {
      logger('Ensuring compiler is running in the background');

      var noop = function noop() {};
      if (_workers2['default'].available()) {
        _workers2['default'].build(opts, noop);
      } else {
        compile(opts, noop);
      }
    }
  });
};

exports['default'] = build;
/* no-op */
//# sourceMappingURL=build.js.map