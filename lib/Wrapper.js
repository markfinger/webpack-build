'use strict';

var path = require('path');
var _ = require('lodash');
var webpack = require('webpack');
var Watcher = require('./Watcher');
var options = require('./options');
var hmr = require('./hmr');
var logger = require('./logger');
var packageJson = require('../package');

var Wrapper = function Wrapper(opts, config, cache) {
  this.opts = options.generate(opts);
  
  this.logger = logger('wrapper', this.opts);
  
  // TODO: remove this, should simply pass the config obj as `opts.config`
  // Convenience hook to pass an object in. You can also define
  // `opts.config` as a path to a file
  this.config = config;

  this.cache = cache;

  // State
  this.watcher = null;
  this.watching = false;

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
    this.logger('loading config file ' + this.opts.config);
    try {
      this.config = require(this.config);
    } catch(err) {
      this.config = null;
      return cb(err);
    }
  }

  if (this.config && this.opts.hmr) {
    try {
      this.config = hmr.config(this.config, this.opts);
    } catch(err) {
      return cb(err);
    }
  }

  if (this.opts.outputPath && this.config.output) {
    this.config.output.path = this.opts.outputPath;
  }

  if (this.config && this.config.env && this.opts.env in this.config.env) {
    this.logger('applying env "' + this.opts.env + '"');
    try {
      this.config = this.config.env[this.opts.env](this.config, this.opts) || this.config;
    } catch(err) {
      return cb(err);
    }
  }

  cb(null, this.config)
};

Wrapper.prototype.getCompiler = function getCompiler(cb) {
  this.getConfig(function(err, config) {
    if (err) return cb(err);

    var compiler = webpack(config);

    compiler.plugin('done', function(stats) {
      if (stats.hasErrors()) {
        this.logger('build error(s)', _.pluck(stats.compilation.errors, 'stack'));
      }
    }.bind(this));

    if (this.opts.config && this.cache) {
      compiler.plugin('compilation', function(compilation) {
        compilation.__startTime = +new Date();
      });

      compiler.plugin('done', function(stats) {
        // TODO: get startTime/endTime from the stats
        if (stats.hasErrors()) {
          this.cache.set(null);
        } else {
          var data = {
            startTime: stats.compilation.__startTime,
            fileDependencies: stats.compilation.fileDependencies,
            dependencies: {
              webpack: require('webpack/package').version,
              'webpack-build': packageJson.version
            },
            stats: this.processStats(stats),
            config: this.opts.config,
            hash: this.opts.hash
          };

          this.cache.set(data, this.opts.watch);
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

      this.logger('compiler completed');
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
      script: [],
      link: []
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
          processed.rendered.link.push(
            '<link rel="stylesheet" href="' + url + '">'
          );
        } else if (path.extname(rel) === '.js') {
          processed.rendered.script.push(
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
      this.watcher = new Watcher(compiler, this.opts);
    } catch(err) {
      return cb(err);
    }

    if (this.opts.config) {
      this.watcher.onInvalid(function() {
        this.logger('watcher detected a change');
      }.bind(this));
    }

    this.watcher.onFailure(function(err) {
      this.logger('watcher failed', err.stack);
    }.bind(this));

    cb(null, this.watcher);
  }.bind(this));
};

Wrapper.prototype.onceWatcherDone = function(cb) {
  this.getWatcher(function(err, watcher) {
    if (err) return cb(err);

    watcher.onceDone(function(err, stats) {
      if (err) return cb(err, stats);

      this.logger('watcher provided current build output');

      this.handleErrAndStats(err, stats, cb);
    }.bind(this));

    this.watching = true;
  }.bind(this));
};

Wrapper.prototype.onceDone = function onceDone(cb) {
  this._onceDone.push(cb);

  this.logger('build requested');

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

module.exports = Wrapper;