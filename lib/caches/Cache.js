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

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var Cache = (function () {
  function Cache(opts) {
    _classCallCheck(this, Cache);

    this.filename = opts.cacheFile;
    this.logger = (0, _log2['default'])('cache', opts);

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
  }

  _createClass(Cache, [{
    key: 'get',
    value: function get(cb) {
      var _this = this;

      var data = this.data;

      if (!data || !Object.keys(data).length) {
        this.logger('no data available');

        return cb(null, null);
      }

      var requiredProps = ['startTime', 'fileDependencies', 'stats', 'config', 'buildHash', 'dependencies', 'assets'];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = requiredProps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var prop = _step.value;

          if (!data[prop]) {
            this.logger('cached data is missing the ' + prop + ' prop');

            return cb(null, null);
          }
        }

        // Check dependency versions
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(data.dependencies)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var depName = _step2.value;

          var requiredVersion = data.dependencies[depName];

          var installedVersion = undefined;
          if (depName === _package2['default'].name) {
            installedVersion = _package2['default'].version;
          } else {
            try {
              installedVersion = require(depName + '/package').version;
            } catch (err) {
              this.logger('cached data references a dependency ' + depName + ' which produced an error during version checks');
              return cb(err, null);
            }
          }

          if (installedVersion !== requiredVersion) {
            var required = depName + '@' + requiredVersion;
            var installed = depName + '@' + installedVersion;
            this.logger('cached data requires a package ' + required + ' but the installed version is ' + installed);

            return cb(null, null);
          }
        }

        // Check the modified times on the config file
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var configFile = data.config.file;
      _fs2['default'].stat(configFile, function (err, stats) {
        if (err) return cb(err);

        if (+stats.mtime > data.startTime) {
          return cb(new Error('Stale config file: ' + configFile + '. Compile start time: ' + data.startTime + '. File mtime: ' + +stats.mtime));
        }

        // Check the modified times on the file dependencies
        _async2['default'].each(data.fileDependencies, function (filename, cb) {
          _fs2['default'].stat(filename, function (err, stats) {
            if (err) return cb(err);

            if (+stats.mtime > data.startTime) {
              return cb(new Error('Stale file dependency: ' + filename + '. Compile start time: ' + data.startTime + '. File mtime: ' + +stats.mtime));
            }

            cb(null, true);
          });
        }, function (err) {
          if (err) {
            _this.logger('File dependency error: ' + err.message);
            return cb(err);
          }

          _async2['default'].each(data.assets, function (filename, cb) {
            _fs2['default'].stat(filename, function (err) {
              if (err) return cb(err);

              cb(null, true);
            });
          }, function (err) {
            if (err) {
              _this.logger('emmitted asset check error: ' + err.message);
              return cb(err);
            }

            _this.logger('cached data successfully retrieved');
            cb(null, data);
          });
        });
      });
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

      this.logger('requesting write to cache file');
      this.write();
    }
  }, {
    key: 'write',
    value: function write() {
      if (this.data && Object.keys(this.data)) {
        this.logger('updating cache file');
      } else {
        this.logger('clearing cache file');
      }

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
    }
  }]);

  return Cache;
})();

exports['default'] = Cache;
module.exports = exports['default'];
//# sourceMappingURL=Cache.js.map