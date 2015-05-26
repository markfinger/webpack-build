'use strict';

var _ = require('lodash');
var webpack = require('webpack');
var chokidar = require('chokidar');
var Watcher = require('./Watcher');

var Wrapper = function Wrapper(opts, config, cache, cacheKey) {
  this.opts = this.generateOptions(opts);

  // Convenience hook to pass an object in. You can also define
  // `opts.config` as a path to a file
  this.config = config;

  this.cache = cache;
  this.cacheKey = cacheKey;

  // State
  this.watcher = null;
  this.watching = false;
  this.watchingConfig = false;

  // Callbacks
  this._onceDone = [];
};

Wrapper.prototype.defaultOptions = {
  watch: false,
  aggregateTimeout: 200,
  poll: undefined,
  useMemoryFS: true,
  watchConfig: false,
  outputPath: null,
  staticRoot: null,
  staticUrl: null,
  cacheFile: null,
  cacheKey: null
};

Wrapper.prototype.generateOptions = function(opts) {
  return _.defaults(opts || {}, this.defaultOptions);
};

Wrapper.prototype.invalidate = function invalidate() {
  if (this.watching) {
    this.watcher.invalidate();
  }
};

Wrapper.prototype.invalidateConfig = function invalidateConfig() {
  if (this.opts.logger) {
    this.opts.logger.info('Webpack: invalidating cached config file ' + this.opts.config);
  }

  this.config = null;

  if (_.isString(this.opts.config)) {
    delete require.cache[this.opts.config];
  }

  if (this.watching) {
    this.watcher.close();
    this.watcher = null;
    this.watching = false;

    if (this.opts.logger) {
      this.opts.logger.info('Webpack: closed watcher for ' + this.opts.config);
    }
  }

  this.invalidate();
};

Wrapper.prototype.getConfig = function getConfig(cb) {
  if (this.config) {
    return cb(null, this.config);
  }

  if (!this.opts.config) {
    return cb(new Error('Wrapper options missing `config` value'));
  }

  this.config = this.opts.config;

  if (_.isString(this.config)) {
    try {
      this.config = require(this.config);
    } catch(err) {
      this.config = null;
      return cb(err);
    }
  }

  if (this.opts.outputPath && this.config && this.config.output) {
    this.config.output.path = this.opts.outputPath;
  }

  if (this.opts.watchConfig && !this.watchingConfig && _.isString(this.opts.config)) {
    this.watchingConfig = true;
    if (this.opts.logger) {
      this.opts.logger.info('Webpack: watching config file ' + this.opts.config);
    }
    this.watchFile(this.opts.config, function() {
      if (this.opts.logger) {
        this.opts.logger.info('Webpack: change detected in config file ' + this.opts.config);
      }
      this.invalidateConfig();
    }.bind(this));
  }

  cb(null, this.config)
};

Wrapper.prototype.getCompiler = function getCompiler(cb) {
  this.getConfig(function(err, config) {
    if (err) return cb(err);

    var compiler = webpack(config);

    if (this.opts.logger) {
      compiler.plugin('done', function(stats) {
        if (stats.hasErrors()) {
          this.opts.logger.error('Webpack: build error', stats.compilation.errors[0].stack);
        } else {
          this.opts.logger.info('Webpack: build completed for ' + this.opts.config);
        }
      }.bind(this));
    }

    if (this.opts.config && this.cache && this.cacheKey) {
      compiler.plugin('compilation', function(compilation) {
        compilation.__startTime = +new Date();
      });

      compiler.plugin('done', function(stats) {
        if (stats.hasErrors()) {
          this.cache.set(this.cacheKey, undefined);
        } else {
          var entry = {
            startTime: stats.compilation.__startTime,
            fileDependencies: stats.compilation.fileDependencies,
            stats: this.processStats(stats),
            config: this.opts.config
          };

          if (this.opts.watch && !this._onceDone.length) {
            this.onceWatcherDone(function(err) {
              if (err) {
                if (this.opts.logger) {
                  this.opts.logger.error('Webpack: cache population error for config file: ' + this.opts.config, err.stack);
                }
                return;
              }

              this.cache.set(this.cacheKey, entry, true);
            }.bind(this));
          } else {
            this.cache.set(this.cacheKey, entry, this.opts.watch);
          }
        }
      }.bind(this));
    }

    cb(null, compiler);
  }.bind(this));
};

Wrapper.prototype.compile = function compile(cb) {
  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    compiler.run(function(err, stats) {
      if (!err && stats.hasErrors()) {
        err = _.first(stats.compilation.errors);
      }

      if (this.opts.logger) {
        this.opts.logger.info('Webpack: compiler built ' + this.opts.config);
      }

      this.handleErrAndStats(err, stats, cb);
    }.bind(this));
  }.bind(this));
};

Wrapper.prototype.processStats = function(stats) {
  if (!stats) return null;

  var processed = stats.toJson({
    modules: false,
    source: false
  });

  if (stats.compilation) {
    processed.pathsToAssets = _.transform(stats.compilation.assets, function(result, obj, asset) {
      result[asset] = obj.existsAt;
    }, {});

    processed.urlsToAssets = {};
    if (this.opts.staticRoot && this.opts.staticUrl) {
      var staticUrl = this.opts.staticUrl;

      if (!_.endsWith(staticUrl, '/')) {
        staticUrl += '/';
      }

      _.forEach(processed.pathsToAssets, function(path, asset) {
        var rel = path.replace(this.opts.staticRoot, '');
        var parts = rel.split(path.sep);
        var relUrl = parts.join('/');
        if (_.startsWith(relUrl, '/')) {
          relUrl = relUrl.slice(1);
        }
        processed.urlsToAssets[asset] = staticUrl + relUrl;
      }, this);
    }
  }

  if (this.config) {
    processed.webpackConfig = this.config;
  } else if (this.opts.config) {
    try {
      processed.webpackConfig = require(this.opts.config);
    } catch(err) {}
  }

  return processed
};

Wrapper.prototype.handleErrAndStats = function(err, stats, cb) {
  if (!stats) {
    return cb(err, stats);
  }

  if (!err && stats && stats.compilation && stats.compilation.errors.length) {
    err = _.first(stats.compilation.errors);
  }

  cb(err, this.processStats(stats));
};

Wrapper.prototype.getWatcher = function getWatcher(cb) {
  if (this.watcher) {
    return cb(null, this.watcher);
  }

  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    try {
      this.watcher = new Watcher(compiler, {
        aggregateTimeout: this.opts.aggregateTimeout,
        poll: this.opts.poll,
        useMemoryFS: this.opts.useMemoryFS
      });
    } catch(err) {
      return cb(err);
    }

    if (this.opts.logger) {
      if (this.opts.config) {
        this.watcher.onInvalid(function() {
          this.opts.logger.info('Webpack: watcher detected a change and has invalidated ' + this.opts.config);
        }.bind(this));
      }

      this.watcher.onFailure(function(err) {
        this.opts.logger.error('Webpack: watcher failure', err.stack);
      }.bind(this));
    }

    cb(null, this.watcher);
  }.bind(this));
};

Wrapper.prototype.onceWatcherDone = function(cb) {
  this.getWatcher(function(err, watcher) {
    if (err) return cb(err);

    var currentStats = watcher.stats;

    watcher.onceDone(function(err, stats) {
      if (err) return cb(err, stats);

      if (this.opts.logger) {
        if (this.cache || (stats && currentStats === stats)) {
          this.opts.logger.info('Webpack: watcher provided current build output for ' + this.opts.config);
        } else {
          this.opts.logger.info('Webpack: watcher built ' + this.opts.config);
        }
      }

      if (this.opts.useMemoryFS) {
        watcher.writeAssets(function(err) {
          if (!err && this.opts.logger) {
            this.opts.logger.info('Webpack: watcher emitted compiled assets ' + this.opts.config);
          }

          this.handleErrAndStats(err, stats, cb);
        }.bind(this));
      } else {
        this.handleErrAndStats(err, stats, cb);
      }
    }.bind(this));

    this.watching = true;
  }.bind(this));
};

Wrapper.prototype.onceDone = function onceDone(cb) {
  this._onceDone.push(cb);

  if (this.opts.logger) {
    this.opts.logger.info('Webpack: requesting build of ' + this.opts.config);
  }

  if (this.opts.watch) {
    if (this._onceDone.length === 1) {
      this.onceWatcherDone(this.callDone.bind(this));
    }
  } else {
    this.compile(this.callDone.bind(this));
  }
};

Wrapper.prototype.callDone = function callDone(err, stats) {
  var _onceDone = this._onceDone;
  this._onceDone = [];

  _onceDone.forEach(function(cb) {
    cb(err, stats);
  }, this);
};

Wrapper.prototype.watchFile = function watchFile(filename, cb) {
  if (Wrapper._watchedFiles[filename]) {
    Wrapper._watchedFiles[filename].push(cb);
  } else {
    Wrapper._watchedFiles[filename] = [cb];
    Wrapper._fileWatcher.add(filename);
  }
};

var _getFileWatcher = function() {
  var fileWatcher = new chokidar.FSWatcher();
  fileWatcher.on('change', Wrapper._onFileChange);
  return fileWatcher;
};

Wrapper._watchedFiles = {};

Wrapper._resetFileWatcher = function _resetFileWatcher() {
  if (Wrapper._fileWatcher) {
    Wrapper._fileWatcher.close();
    Wrapper._fileWatcher = _getFileWatcher();
  }
  Wrapper._watchedFiles = {};
};

Wrapper._onFileChange = function _onFileChange(filename) {
  var callbacks = Wrapper._watchedFiles[filename];
  if (callbacks && callbacks.length) {
    callbacks.forEach(function(cb) {
      cb();
    });
  }
};

Wrapper._fileWatcher = _getFileWatcher();

module.exports = Wrapper;