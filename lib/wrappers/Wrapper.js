'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _hmr = require('../hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _hmrConfig = require('../hmr/config');

var _hmrConfig2 = _interopRequireDefault(_hmrConfig);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _caches = require('../caches');

var _caches2 = _interopRequireDefault(_caches);

var _Watcher = require('./Watcher');

var _Watcher2 = _interopRequireDefault(_Watcher);

var Wrapper = (function () {
  function Wrapper(opts, config) {
    _classCallCheck(this, Wrapper);

    this.opts = (0, _options2['default'])(opts);

    this.logger = (0, _log2['default'])('wrapper', this.opts);

    // TODO: remove this, in favour of `opts.config`
    // Convenience hook to pass an object in. Mostly of convenience in the
    // test suite
    this.config = config;

    // State
    this.watcher = null;

    // Callbacks
    this._onceDone = [];
  }

  _createClass(Wrapper, [{
    key: 'getConfig',
    value: function getConfig(cb) {
      this.logger('fetching config object');

      if (this.config) {
        return cb(null, this.config);
      }

      if (!this.opts.config) {
        return cb(new Error('Wrapper options missing `config` value'));
      }

      var factory = undefined;

      if (_lodash2['default'].isString(this.opts.config)) {
        this.logger('loading config file ' + this.opts.config);
        try {
          factory = require(this.opts.config);
        } catch (err) {
          return cb(err);
        }

        if (!_lodash2['default'].isFunction(factory)) {
          return cb(new Error('File ' + this.opts.config + ' does not export a function'));
        }
      } else {
        factory = this.opts.config;

        if (!_lodash2['default'].isFunction(factory)) {
          return cb(new Error('Config option is not a function'));
        }
      }

      try {
        this.config = factory(this.opts);
      } catch (err) {
        return cb(err);
      }

      if (!this.config || !_lodash2['default'].isObject(this.config)) {
        if (_lodash2['default'].isString(this.opts.config)) {
          return cb(new Error('The factory exported by ' + this.opts.config + ' did not return an object'));
        }
        return cb(new Error('The config factory does not return an object'));
      }

      if (this.opts.hmr) {
        try {
          (0, _hmrConfig2['default'])(this.config, this.opts);
        } catch (err) {
          return cb(err);
        }
      }

      if (this.opts.outputPath && this.config.output) {
        this.config.output.path = this.opts.outputPath;
      }

      cb(null, this.config);
    }
  }, {
    key: 'getCompiler',
    value: function getCompiler(cb) {
      var _this = this;

      this.logger('creating compiler');
      this.getConfig(function (err, config) {
        if (err) return cb(err);

        var compiler = (0, _webpack2['default'])(config);

        _this.logger('adding cache hooks to compiler');
        compiler.plugin('done', function (stats) {
          if (stats.hasErrors()) {
            _this.logger('build error(s)...');
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = stats.compilation.errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _err = _step.value;

                _this.logger('... => ' + _err.stack);
              }
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

            _caches2['default'].set(_this.opts, null);
          } else {
            _caches2['default'].set(_this.opts, _this.generateOutput(stats));
          }
        });

        if (_this.opts.watch && _this.opts.hmr && _this.opts.hmrRoot) {
          _this.logger('adding hmr hooks to compiler');

          _hmr2['default'].register(_this.opts);

          compiler.plugin('done', function (stats) {
            _this.logger('emitting done signal to hmr');

            _hmr2['default'].emitDone(_this.opts, stats);
          });

          compiler.plugin('invalid', function () {
            _this.logger('emitting invalid signal to hmr');

            _hmr2['default'].emitInvalid(_this.opts);
          });
        }

        cb(null, compiler);
      });
    }
  }, {
    key: 'compile',
    value: function compile(cb) {
      var _this2 = this;

      this.getCompiler(function (err, compiler) {
        if (err) return cb(err);

        _this2.logger('starting compiler');
        compiler.run(function (err, stats) {
          if (!err && stats.hasErrors()) {
            err = _lodash2['default'].first(stats.compilation.errors);
          }

          _this2.logger('compiler completed');
          _this2.handleErrAndStats(err, stats, cb);
        });
      });
    }
  }, {
    key: 'generateOutput',
    value: function generateOutput(stats) {
      var _this3 = this;

      if (!stats) return null;

      this.logger('generating output object');

      var dependencies = {
        webpack: require('webpack/package').version,
        'webpack-build': _package2['default'].version
      };

      var statsJson = stats.toJson({
        modules: false,
        source: false
      });

      var assets = _lodash2['default'].pluck(stats.compilation.assets, 'existsAt');

      var output = _lodash2['default'].transform(stats.compilation.chunks, function (result, chunk) {
        var obj = {
          js: [],
          css: [],
          files: []
        };

        chunk.files.forEach(function (filename) {
          filename = _path2['default'].join(stats.compilation.outputOptions.path, filename);
          var ext = _path2['default'].extname(filename);
          if (ext === '.js') {
            obj.js.push(filename);
          } else if (ext === '.css') {
            obj.css.push(filename);
          } else {
            obj.files.push(filename);
          }
        });

        result[chunk.name] = obj;
      }, {});

      var urls = {};
      if (this.opts.staticRoot && this.opts.staticUrl) {
        (function () {
          var absPathToRelUrl = function absPathToRelUrl(absPath) {
            var relPath = absPath.replace(_this3.opts.staticRoot, '');

            var relUrl = relPath.split(_path2['default'].sep).join('/');
            if (_lodash2['default'].startsWith(relUrl, '/')) {
              relUrl = relUrl.slice(1);
            }

            return _this3.opts.staticUrl + relUrl;
          };

          urls = _lodash2['default'].transform(output, function (result, group, chunkName) {
            return result[chunkName] = _lodash2['default'].mapValues(group, function (paths) {
              return paths.map(absPathToRelUrl);
            });
          });
        })();
      }

      return {
        startTime: stats.startTime,
        endTime: stats.endTime,
        config: {
          file: this.opts.config
        },
        buildHash: this.opts.buildHash,
        buildOptions: this.opts,
        outputOptions: stats.compilation.outputOptions,
        assets: assets,
        output: output,
        urls: urls,
        stats: statsJson,
        fileDependencies: stats.compilation.fileDependencies,
        dependencies: dependencies
      };
    }
  }, {
    key: 'handleErrAndStats',
    value: function handleErrAndStats(err, stats, cb) {
      if (err) {
        return cb(err, stats && this.generateOutput(stats));
      }

      if (stats.hasErrors()) {
        err = _lodash2['default'].first(stats.compilation.errors);
      }

      cb(err, this.generateOutput(stats));
    }
  }, {
    key: 'getWatcher',
    value: function getWatcher(cb) {
      var _this4 = this;

      this.logger('fetching watcher');

      if (this.watcher) {
        return cb(null, this.watcher);
      }

      this.getCompiler(function (err, compiler) {
        if (err) return cb(err);

        _this4.logger('creating watcher');

        try {
          _this4.watcher = new _Watcher2['default'](compiler, _this4.opts);
        } catch (err) {
          return cb(err);
        }

        if (_this4.opts.config) {
          _this4.watcher.onInvalid(function () {
            _this4.logger('watcher detected a change');
          });
        }

        _this4.watcher.onFailure(function (err) {
          _this4.logger('watcher failed', err.stack);
        });

        cb(null, _this4.watcher);
      });
    }
  }, {
    key: 'onceWatcherDone',
    value: function onceWatcherDone(cb) {
      var _this5 = this;

      this.getWatcher(function (err, watcher) {
        if (err) return cb(err);

        watcher.onceDone(function (err, stats) {
          _this5.logger('watcher provided current build output');
          _this5.handleErrAndStats(err, stats, cb);
        });
      });
    }
  }, {
    key: 'onceDone',
    value: function onceDone(cb) {
      this._onceDone.push(cb);

      this.logger('build requested');

      if (this.opts.watch) {
        if (this._onceDone.length === 1) {
          this.onceWatcherDone(this.callDone.bind(this));
        }
      } else {
        this.compile(this.callDone.bind(this));
      }
    }
  }, {
    key: 'callDone',
    value: function callDone(err, stats) {
      var _onceDone = this._onceDone;
      this._onceDone = [];

      _onceDone.forEach(function (cb) {
        return cb(err, stats);
      });
    }
  }]);

  return Wrapper;
})();

exports['default'] = Wrapper;
module.exports = exports['default'];
//# sourceMappingURL=Wrapper.js.map