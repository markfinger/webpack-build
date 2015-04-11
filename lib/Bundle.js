var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var _ = require('lodash');
var chokidar = require('chokidar');
var WebpackWatcher = require('webpack-watcher');

var Bundle = function Bundle(opts) {
  this.opts = _.defaults(opts || {}, this.defaultOptions);

  // State
  this.compiler = null;
  this.isCompiling = false;
  this.hasCompiled = false;
  this.watchingConfig = false;
  this.watcher = null;
  this.watching = false;

  // Cache
  this.err = null;
  this.stats = null;

  // Callbacks
  this._onceDone = [];
};

Bundle.prototype.defaultOptions = {
  watch: false,
  watchDelay: 200,
  watchConfig: false,
  cache: false
};

Bundle.prototype.invalidate = function invalidate() {
  this.isCompiling = false;
  this.hasCompiled = false;
  this.compiler = null;
  if (this.watching) {
    this.watcher.invalidate();
  }
  this.err = null;
  this.stats = null;
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
      return cb(err);
    }
  }

  if (this.opts.watchConfig && !this.watchingConfig && _.isString(this.opts.config)) {
    this.watchingConfig = true;
    this.watchFile(this.opts.config, this.invalidateConfig.bind(this));
  }

  cb(null, this.config)
};

Bundle.prototype.getCompiler = function getCompiler(cb) {
  if (this.compiler) {
    return cb(null, this.compiler);
  }

  this.getConfig(function(err, config) {
    if (err) return cb(err);

    var compiler = webpack(config);

    if (this.opts.cache) {
      this.compiler = compiler;
    }

    cb(null, compiler);
  }.bind(this));
};

Bundle.prototype.compile = function compile(cb) {
  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    this.invalidate();
    this.isCompiling = true;

    compiler.run(function(err, stats) {
      if (!err && stats.hasErrors()) {
        err = _.first(stats.compilation.errors);
      }

      if (this.opts.cache) {
        this.err = err;
        this.stats = stats;
      }

      this.isCompiling = false;
      this.hasCompiled = !err;

      if (cb) {
        cb(err, stats);
      }
    }.bind(this));
  }.bind(this));
};

Bundle.prototype.getWatcher = function getWatcher(cb) {
  if (this.watcher) {
    return cb(null, this.watcher);
  }

  this.getCompiler(function(err, compiler) {
    if (err) return cb(err);

    try {
      this.watcher = new WebpackWatcher(compiler, {
        watchDelay: this.opts.watchDelay
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
        cb(err, stats);
      });
    });

    this.watching = true;
  }.bind(this));
};

Bundle.prototype.onceDone = function onceDone(cb) {
  this._onceDone.push(cb);

  if (this.opts.watch) {
    if (this._onceDone.length === 1) {
      this.onceWatcherDone(this.callDone.bind(this));
    }
  } else if (this.opts.cache && this.hasCompiled) {
      this.callDone(this.err, this.stats);
  } else if (!this.isCompiling) {
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

Bundle._watchedFiles = {};

Bundle._fileWatcher = null;

var _getFileWatcher = function() {
  var fileWatcher = new chokidar.FSWatcher();
  fileWatcher.on('change', Bundle._onFileChange);
  return fileWatcher;
};

Bundle.prototype.watchFile = function watchFile(filename, cb) {
  //if (!Bundle._fileWatcher) {
  //
  //}

  if (Bundle._watchedFiles[filename]) {
    Bundle._watchedFiles[filename].push(cb);
  } else {
    Bundle._watchedFiles[filename] = [cb];
    Bundle._fileWatcher.add(filename);
  }
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

Bundle._resetFileWatcher = function _resetFileWatcher() {
  if (Bundle._fileWatcher) {
    Bundle._fileWatcher.close();
    Bundle._fileWatcher = _getFileWatcher();
  }
  Bundle._watchedFiles = {};
};

module.exports = Bundle;