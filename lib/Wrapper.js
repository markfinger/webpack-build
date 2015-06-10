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

var _Watcher = require('./Watcher');

var _Watcher2 = _interopRequireDefault(_Watcher);

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _hmr = require('./hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _hmrConfig = require('./hmr/config');

var _hmrConfig2 = _interopRequireDefault(_hmrConfig);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _package = require('../package');

var _package2 = _interopRequireDefault(_package);

var Wrapper = (function () {
  function Wrapper(opts, config, cache) {
    _classCallCheck(this, Wrapper);

    this.opts = (0, _options2['default'])(opts);

    this.logger = (0, _log2['default'])('wrapper', this.opts);

    // TODO: remove this, it's mostly legacy in the test suite. Should simply pass the config obj as `opts.config`
    // Convenience hook to pass an object in. You can also define
    // `opts.config` as a path to a file
    this.config = config;

    this.cache = cache;

    // State
    this.watcher = null;

    // Callbacks
    this._onceDone = [];
  }

  _createClass(Wrapper, [{
    key: 'getConfig',
    value: function getConfig(cb) {
      if (this.config) {
        return cb(null, this.config);
      }

      if (!this.opts.config) {
        return cb(new Error('Wrapper options missing `config` value'));
      }

      this.config = this.opts.config;

      if (_lodash2['default'].isString(this.config)) {
        this.logger('loading config file ' + this.opts.config);
        try {
          this.config = require(this.config);
        } catch (err) {
          this.config = null;
          return cb(err);
        }
      }

      if (this.config && this.opts.hmr) {
        try {
          (0, _hmrConfig2['default'])(this.config, this.opts);
        } catch (err) {
          return cb(err);
        }
      }

      if (this.opts.outputPath && this.config.output) {
        this.config.output.path = this.opts.outputPath;
      }

      if (this.config && this.config.env && this.opts.env in this.config.env) {
        this.logger('applying env "' + this.opts.env + '"');
        var env = this.config.env[this.opts.env];
        try {
          env(this.config, this.opts);
        } catch (err) {
          return cb(err);
        }
      }

      cb(null, this.config);
    }
  }, {
    key: 'getCompiler',
    value: function getCompiler(cb) {
      var _this = this;

      this.getConfig(function (err, config) {
        if (err) return cb(err);

        var compiler = (0, _webpack2['default'])(config);

        compiler.plugin('done', function (stats) {
          if (stats.hasErrors()) {
            _this.logger('build error(s)', _lodash2['default'].pluck(stats.compilation.errors, 'stack'));
          }
        });

        if (_this.opts.config && _this.cache) {
          compiler.plugin('done', function (stats) {
            // TODO: get startTime/endTime from the stats
            if (stats.hasErrors()) {
              _this.cache.set(null);
            } else {
              _this.cache.set(_this.generateOutput(stats), _this.opts.watch);
            }
          });
        }

        if (_this.opts.watch && _this.opts.hmr && _this.opts.hmrRoot) {
          _hmr2['default'].bindCompiler(compiler, _this.opts);
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

      var data = {
        startTime: stats.startTime,
        endTime: stats.endTime,
        stats: stats.toJson({
          modules: false,
          source: false
        }),
        fileDependencies: stats.compilation.fileDependencies,
        dependencies: {
          webpack: require('webpack/package').version,
          'webpack-build': _package2['default'].version
        },
        config: this.opts.config,
        buildHash: this.opts.buildHash,
        pathsToAssets: _lodash2['default'].transform(stats.compilation.assets, function (result, obj, asset) {
          return result[asset] = obj.existsAt;
        }, {} // TODO: can probably remove this line
        ),
        urlsToAssets: {},
        rendered: {
          script: [],
          link: []
        },
        output: _lodash2['default'].transform(stats.compilation.chunks, function (result, chunk) {
          var output = {
            js: [],
            css: [],
            files: []
          };
          chunk.files.forEach(function (filename) {
            filename = _path2['default'].join(stats.compilation.outputOptions.path, filename);
            var ext = _path2['default'].extname(filename);
            if (ext === '.js') {
              output.js.push(filename);
            } else if (ext === '.css') {
              output.css.push(filename);
            } else {
              output.files.push(filename);
            }
          });
          result[chunk.name] = output;
        }, {}),
        buildOptions: this.opts
      };

      if (this.opts.staticRoot && this.opts.staticUrl) {
        _lodash2['default'].forEach(data.pathsToAssets, function (absPath, asset) {
          var relPath = absPath.replace(_this3.opts.staticRoot, '');

          var relUrl = relPath.split(_path2['default'].sep).join('/');
          if (_lodash2['default'].startsWith(relUrl, '/')) {
            relUrl = relUrl.slice(1);
          }

          var url = _this3.opts.staticUrl + relUrl;
          data.urlsToAssets[asset] = url;

          if (_path2['default'].extname(relPath) === '.css') {
            data.rendered.link.push('<link rel="stylesheet" href="' + url + '">');
          } else if (_path2['default'].extname(relPath) === '.js') {
            data.rendered.script.push('<script src="' + url + '"></script>');
          }
        });
      }

      if (this.config) {
        data.webpackConfig = this.config;
      } else if (this.opts.config) {
        try {
          data.webpackConfig = require(this.opts.config);
        } catch (err) {}
      }

      return data;
    }
  }, {
    key: 'handleErrAndStats',
    value: function handleErrAndStats(err, stats, cb) {
      if (err) {
        return cb(err);
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

      if (this.watcher) {
        return cb(null, this.watcher);
      }

      this.getCompiler(function (err, compiler) {
        if (err) return cb(err);

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
          if (err) return cb(err, stats);

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