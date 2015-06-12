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

var _cache = require('./cache');

var _cache2 = _interopRequireDefault(_cache);

var fileTimestamps = Object.create(null);

var checkConfigfile = function checkConfigfile(configFile) {
  if (!configFile) {
    return new Error('Config file not defined');
  }

  if (!_lodash2['default'].isString(configFile)) {
    return new Error('Config file option must be a string');
  }

  if (fileTimestamps[configFile]) {
    var timestamp = undefined;
    try {
      timestamp = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }

    if (timestamp > fileTimestamps[configFile]) {
      return new Error('Config file has changed since being loaded into memory. Restart the process');
    }
  } else {
    try {
      require(configFile);
    } catch (err) {
      return err;
    }

    try {
      fileTimestamps[configFile] = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }
  }
};

var build = function build(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('build', opts);
  logger('build request lodged for ' + opts.config);

  logger('requesting data from cache');
  _cache2['default'].get(opts, function (err, data) {
    if (err) {
      logger('cache produced an error', err.message);
    }

    var emit = function emit(err, data) {
      if (err) {
        logger('error encountered during build', err);
      } else {
        logger('serving data from build');
      }
      cb(err, data);
    };

    if (data) {
      logger('cached data received');
      emit(null, data);
    } else {
      logger('cache has no matching data or has delegated, calling wrapper');
    }

    if (!data || opts.watch) {
      // Ensure that the imported version of the config file is fresh
      logger('checking timestamps on ' + opts.config);
      var configErr = checkConfigfile(opts.config, cb);
      if (configErr) {
        logger('error encountered when checking timestamps on ' + opts.config, configErr.stack);
        return cb(configErr);
      }

      var wrapper = _wrappers2['default'].get(opts);

      if (!data) {
        return wrapper.onceDone(emit);
      }

      if (opts.watch && !wrapper.watcher) {
        logger('Starting watcher in the background');
        wrapper.onceWatcherDone(function () {});
      }
    }
  });
};

exports['default'] = build;
module.exports = exports['default'];
/* no-op */
//# sourceMappingURL=build.js.map