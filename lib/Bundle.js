'use strict';

var _ = require('lodash');
var webpack = require('webpack');
var chokidar = require('chokidar');
var Watcher = require('./Watcher');

var Bundle = function Bundle(opts, config, cache) {
  this.opts = this.generateOptions(opts);

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

Bundle.prototype.defaultOptions = {
  watch: false,
  aggregateTimeout: 200,
  poll: undefined,
  useMemoryFS: true,
  watchConfig: false,
  bundleDir: null
};

Bundle.prototype.generateOptions = function(opts) {
  return _.defaults(opts || {}, this.defaultOptions);
};

Bundle.prototype.invalidate = function invalidate() {
  if (this.watching) {
    this.watcher.invalidate();
  }
};

Bundle.prototype.invalidateConfig = function invalidateConfig() {
  this.config = null;
  if (_.isString(this.opts.config)) {
    delete require.cache[this.opts.config];
  }
  if (this.watching) {
    this.watcher.close();
    this.watcher = null;
    this.watching = false;
  }
  this.invalidate();
};

Bundle.prototype.getConfig = function getConfig(cb) {
  if (this.config) {
    return cb(null, this.config);
  }

  if (!this.opts.config) {
    return cb(new Error('Bundle options missing `config` value'));
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

  if (this.opts.bundleDir && this.config && this.config.output && this.config.output.path) {
    this.config.output.path = this.config.output.path.replace('[bundle_dir]', this.opts.bundleDir);
  }

  if (this.opts.watchConfig && !this.watchingConfig && _.isString(this.opts.config)) {
    this.watchingConfig = true;
    this.watchFile(this.opts.config, this.invalidateConfig.bind(this));
  }

  cb(null, this.config)
};

Bundle.prototype.getCompiler = function getCompiler(cb) {
  this.getConfig(function(err, config) {
    if (err) return cb(err);

    var compiler = webpack(config);

    if (this.opts.config && this.cache) {
      compiler.plugin('compilation', function(compilation) {
        compilation.__startTime = +new Date();
      });

      compiler.plugin('done', function(stats) {
        if (stats.hasErrors()) {
          this.cache.set(this.opts.config, undefined);
        } else {
          this.cache.set(this.opts.config, {
            startTime: stats.compilation.__startTime,
            fileDependencies: stats.compilation.fileDependencies,
            stats: this.processStats(stats)
          }, this.opts.watch);
        }
      }.bind(this));
    }

    cb(null, compiler);
  }.bind(this));
};

Bundle.prototype.compile = function compile(cb) {
  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    this.invalidate();

    compiler.run(function(err, stats) {
      if (!err && stats.hasErrors()) {
        err = _.first(stats.compilation.errors);
      }

      this.handleErrAndStats(err, stats, cb);
    }.bind(this));
  }.bind(this));
};

Bundle.prototype.processStats = function(stats) {
  var processed;

  if (stats.toJson) {
    processed = stats.toJson({
      modules: false,
      source: false
    });
  }

  if (stats.compilation) {
    var pathsToAssets = {};

    _.forEach(stats.compilation.assets, function(obj, asset) {
      pathsToAssets[asset] = obj.existsAt;
    });

    processed.pathsToAssets = pathsToAssets
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

Bundle.prototype.handleErrAndStats = function(err, stats, cb) {
  if (!stats) {
    return cb(err, stats);
  }

  if (!err && stats && stats.compilation && stats.compilation.errors.length) {
    err = _.first(stats.compilation.errors);
  }

  cb(err, this.processStats(stats));
};

Bundle.prototype.getWatcher = function getWatcher(cb) {
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

    cb(null, this.watcher);
  }.bind(this));
};

Bundle.prototype.onceWatcherDone = function(cb) {
  this.getWatcher(function(err, watcher) {
    if (err) return cb(err);

    watcher.onceDone(function(err, stats) {
      if (err) return cb(err, stats);

      watcher.writeAssets(function(err) {
        this.handleErrAndStats(err, stats, cb);
      }.bind(this));
    }.bind(this));

    this.watching = true;
  }.bind(this));
};

Bundle.prototype.onceDone = function onceDone(cb) {
  this._onceDone.push(cb);

  if (this.opts.watch) {
    if (this._onceDone.length === 1) {
      this.onceWatcherDone(this.callDone.bind(this));
    }
  } else {
    this.compile(this.callDone.bind(this));
  }
};

Bundle.prototype.callDone = function callDone(err, stats) {
  var _onceDone = this._onceDone;
  this._onceDone = [];

  _onceDone.forEach(function(cb) {
    cb(err, stats);
  }, this);
};

Bundle.prototype.watchFile = function watchFile(filename, cb) {
  if (Bundle._watchedFiles[filename]) {
    Bundle._watchedFiles[filename].push(cb);
  } else {
    Bundle._watchedFiles[filename] = [cb];
    Bundle._fileWatcher.add(filename);
  }
};

var _getFileWatcher = function() {
  var fileWatcher = new chokidar.FSWatcher();
  fileWatcher.on('change', Bundle._onFileChange);
  return fileWatcher;
};

Bundle._watchedFiles = {};

Bundle._resetFileWatcher = function _resetFileWatcher() {
  if (Bundle._fileWatcher) {
    Bundle._fileWatcher.close();
    Bundle._fileWatcher = _getFileWatcher();
  }
  Bundle._watchedFiles = {};
};

Bundle._onFileChange = function _onFileChange(filename) {
  var callbacks = Bundle._watchedFiles[filename];
  if (callbacks && callbacks.length) {
    callbacks.forEach(function(cb) {
      cb();
    });
  }
};

Bundle._fileWatcher = _getFileWatcher();

module.exports = Bundle;