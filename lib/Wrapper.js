'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');
var chokidar = require('chokidar');
var Watcher = require('./Watcher');
var options = require('./options');
var hmr = require('./hmr');
var builds = require('./builds');

var Wrapper = function Wrapper(opts, config, cache) {
  this.opts = options.generate(opts);

  // TODO: remove this, should simply pass the config obj as `opts.config`
  // Convenience hook to pass an object in. You can also define
  // `opts.config` as a path to a file
  this.config = config;

  this.cache = cache;

  // State
  this.watcher = null;
  this.watching = false;
  this.watchingConfig = false;

  // Callbacks
  this._onceDone = [];
};

Wrapper.prototype.invalidate = function invalidate() {
  if (this.watching) {
    this.watcher.invalidate();
  }
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

  if (this.config && this.opts.hmr) {
    try {
      this.config = builds.hmr(this.config, this.opts);
    } catch(err) {
      return cb(err);
    }
  }

  if (this.config && this.opts.build) {
    if (!this.config.builds) {
      return cb(new Error('No builds property has been defined on ' + this.opts.config));
    }

    if (this.opts.build in this.config.builds) {
      if (this.opts.logger) {
        this.opts.logger.info('Webpack: applying build "' + this.opts.build + '" to ' + this.opts.config);
      }

      try {
        this.config = this.config.builds[this.opts.build](this.config, this.opts);
      } catch(err) {
        return cb(err);
      }
    } else {
      return cb(new Error(
        'Unknown build "' + this.opts.build + '". ' +
        'Available builds: ' + Object.keys(this.config.builds).join(', ')
      ));
    }
  }

  if (this.opts.outputPath && this.config.output) {
    this.config.output.path = this.opts.outputPath;
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
          this.opts.logger.info('Webpack: build completed for ' + this.getIdentifier());
        }
      }.bind(this));
    }

    if (this.opts.config && this.cache && this.opts.cacheKey) {
      compiler.plugin('compilation', function(compilation) {
        compilation.__startTime = +new Date();
      });

      compiler.plugin('done', function(stats) {
        if (stats.hasErrors()) {
          this.cache.set(this.opts.cacheKey, undefined);
        } else {
          var entry = {
            startTime: stats.compilation.__startTime,
            fileDependencies: stats.compilation.fileDependencies,
            stats: this.processStats(stats),
            config: this.opts.config,
            optsHash: this.opts.hash
          };

          if (this.opts.watch && !this._onceDone.length) {
            this.onceWatcherDone(function(err) {
              if (err) {
                if (this.opts.logger) {
                  this.opts.logger.error('Webpack: cache population error for ' + this.getIdentifier(), err.stack);
                }
                return;
              }

              this.cache.set(this.opts.cacheKey, entry, true);
            }.bind(this));
          } else {
            this.cache.set(this.opts.cacheKey, entry, this.opts.watch);
          }
        }
      }.bind(this));
    }

    if (this.opts.watch && this.opts.hmr && this.opts.hmrRoot) {
      hmr.bindCompiler(compiler, this.opts);
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
        this.opts.logger.info('Webpack: compiler built ' + this.getIdentifier());
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
    processed.rendered = {
      scripts: [],
      styleSheets: []
    };
    if (this.opts.staticRoot && this.opts.staticUrl) {
      _.forEach(processed.pathsToAssets, function(absPath, asset) {
        var rel = absPath.replace(this.opts.staticRoot, '');

        var parts = rel.split(path.sep);

        var relUrl = parts.join('/');

        if (_.startsWith(relUrl, '/')) {
          relUrl = relUrl.slice(1);
        }

        var url = this.opts.staticUrl + relUrl;

        processed.urlsToAssets[asset] = url;

        if (path.extname(rel) === '.css') {
          processed.rendered.styleSheets.push(
            '<link rel="stylesheet" href="' + url + '">'
          );
        }

        if (path.extname(rel) === '.js') {
          processed.rendered.scripts.push(
            '<script src="' + url + '"></script>'
          );
        }
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
        poll: this.opts.poll
      });
    } catch(err) {
      return cb(err);
    }

    if (this.opts.logger) {
      if (this.opts.config) {
        this.watcher.onInvalid(function() {
          this.opts.logger.info('Webpack: watcher detected a change and has invalidated ' + this.getIdentifier());
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
          this.opts.logger.info('Webpack: watcher provided current build output for ' + this.getIdentifier());
        } else {
          this.opts.logger.info('Webpack: watcher built ' + this.getIdentifier());
        }
      }

      this.handleErrAndStats(err, stats, cb);
    }.bind(this));

    this.watching = true;
  }.bind(this));
};

Wrapper.prototype.onceDone = function onceDone(cb) {
  this._onceDone.push(cb);

  if (this.opts.logger) {
    this.opts.logger.info('Webpack: requesting build of ' + this.getIdentifier());
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

Wrapper.prototype.getIdentifier = function getIdentifier() {
  if (this.opts.cacheKey) {
    return this.opts.cacheKey;
  }
  if (this.opts.config) {
    return this.opts.config
  }
  return this.config;
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