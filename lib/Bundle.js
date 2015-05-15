'use strict';

var _ = require('lodash');
var webpack = require('webpack');
var chokidar = require('chokidar');
var Watcher = require('./Watcher');

var Bundle = function Bundle(opts, config) {
  this.opts = this.generateOptions(opts);

  // Convenience hook to pass an object in. You can also define
  // `opts.config` as a path to a file
  this.config = config;

  // State
  this.watcher = null;
  this.watching = false;
  this.watchingConfig = false;

  // Callbacks
  this._onceDone = [];
};

Bundle.prototype.defaultOptions = {
  watch: false,
  watchDelay: 200,
  useMemoryFS: true,
  watchConfig: false,
  bundleDir: null,
  logger: console
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

Bundle.prototype.handleErrAndStats = function(err, stats, cb) {
  if (!stats) {
    return cb(err, stats);
  }

  if (stats.compilation) {
    stats.pathsToAssets = {};

    _.forEach(stats.compilation.assets, function(obj, asset) {
      if (obj.emitted) {
        stats.pathsToAssets[asset] = obj.existsAt;
      }
    });

    if (!err && stats.compilation.errors.length) {
      err = _.first(stats.compilation.errors);
    }
  }

  this.getConfig(function(configErr, config) {
    if (config) {
      stats.webpackConfig = config;
    }
    cb(err, stats);
  });
};

Bundle.prototype.getWatcher = function getWatcher(cb) {
  if (this.watcher) {
    return cb(null, this.watcher);
  }

  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    try {
      this.watcher = new Watcher(compiler, {
        watchDelay: this.opts.watchDelay,
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

Bundle._fileWatcherOptions = {};

var _getFileWatcher = function() {
  var fileWatcher = new chokidar.FSWatcher(Bundle._fileWatcherOptions);
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