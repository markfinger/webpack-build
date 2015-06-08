'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _package = require('../package');

var _package2 = _interopRequireDefault(_package);

var Cache = (function () {
  function Cache(opts) {
    _classCallCheck(this, Cache);

    this.filename = opts.cacheFile;
    this.logger = (0, _logger2['default'])('cache', opts);

    // A flag denoting that another part of the system will serve
    // the data, rather than this cache
    this.delegate = false;

    try {
      var data = _fs2['default'].readFileSync(this.filename);
      this.data = JSON.parse(data.toString());
      this.logger('loaded cache file');
    } catch (err) {
      this.logger('cache load error', err.message);
    }

    if (!this.data) {
      this.data = {};
    }

    // Update the file with the current state
    this.write();
  }

  _createClass(Cache, [{
    key: 'get',
    value: function get(cb) {
      var data = this.data;

      if (!data || !Object.keys(data).length) {
        this.logger('no data available');

        return cb(null, null);
      }

      var requiredProps = ['startTime', 'fileDependencies', 'stats', 'config', 'hash', 'dependencies'];

      for (var i = 0; i < requiredProps.length; i++) {
        if (!data[requiredProps[i]]) {
          this.logger('cached data is missing the ' + requiredProps[i] + ' prop');

          return cb(null, null);
        }
      }

      // Check dependency versions
      var depNames = Object.keys(data.dependencies);
      for (var i = 0; i < depNames.length; i++) {
        var depName = depNames[i];
        var requiredDepVersion = data.dependencies[depName];

        var depVersion = undefined;
        if (depName === _package2['default'].name) {
          depVersion = _package2['default'].version;
        } else {
          try {
            depVersion = require(depName + '/package').version;
          } catch (err) {
            this.logger('cached data references a dependency ' + depName + ' which produced an error during version checks');
            return cb(err, null);
          }
        }

        if (depVersion !== requiredDepVersion) {
          this.logger('cached data references a dependency ' + depName + '@' + requiredDepVersion + ' but the ' + 'installed version is ' + depName + '@' + requiredDepVersion);

          return cb(null, null);
        }
      }

      // Check the modified times on the config file
      var configFile = data.config;
      _fs2['default'].stat(configFile, (function (err, stats) {
        if (err) return cb(err);

        if (+stats.mtime > data.startTime) {
          return cb(new Error('Stale config file: ' + configFile + '. ' + 'Compile start time: ' + data.startTime + '. ' + 'File mtime: ' + +stats.mtime));
        }

        // Check the modified times on the file dependencies
        _async2['default'].each(data.fileDependencies, function (filename, cb) {
          _fs2['default'].stat(filename, function (err, stats) {
            if (err) return cb(err);

            if (+stats.mtime > data.startTime) {
              return cb(new Error('Stale file dependency: ' + filename + '. ' + 'Compile start time: ' + data.startTime + '. ' + 'File mtime: ' + +stats.mtime));
            }

            cb(null, true);
          });
        }, (function (err) {
          if (err) {
            this.logger('cache retrieval error', err.message);
            return cb(err);
          }

          this.logger('serving cached data');
          cb(null, data);
        }).bind(this));
      }).bind(this));
    }
  }, {
    key: 'set',
    value: function set(data, delegate) {
      this.data = data;

      if (delegate) {
        // Indicate that the we should no longer rely on the cache's store.
        // This enables the watcher's internal cache to take over the service
        // of cached output
        this.delegate = true;
      }

      if (data) {
        this.logger('updated cache file');
      } else {
        this.logger('cleared cache file');
      }

      this.write();
    }
  }, {
    key: 'write',
    value: function write() {
      var json = JSON.stringify(this.data, null, 2);

      try {
        _mkdirp2['default'].sync(_path2['default'].dirname(this.filename));
      } catch (err) {
        throw new Error('Failed to create path to webpack cache file: ' + this.filename);
      }

      try {
        _fs2['default'].writeFileSync(this.filename, json);
      } catch (err) {
        throw new Error('Failed to write webpack cache file: ' + this.filename);
      }

      this.logger('updated cache file');
    }
  }]);

  return Cache;
})();

exports['default'] = Cache;
module.exports = exports['default'];
//# sourceMappingURL=Cache.js.map