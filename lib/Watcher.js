var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var MemoryFileSystem = require('memory-fs');
var async = require('async');
var mkdirp = require('mkdirp');

var Watcher = function Watcher(compiler, opts) {
  this.opts = _.defaults(opts || {}, this.defaultOptions);

  // Callback stores
  this._onDone = []; // function(err, stats) {}
  this._onceDone = []; // function(err, stats) {}
  this._onInvalid = []; // function() {}

  // State and compilation output
  this.isWatching = false;
  this.watcher = null;
  this.isReady = false;
  this.err = null;
  this.stats = null;

  // Hook in to the compiler
  this.compiler = compiler;
  this.compiler.plugin('done', this.handleDone.bind(this));
  this.compiler.plugin('invalid', this.handleInvalid.bind(this));
  this.compiler.plugin('failed', this.handleFailure.bind(this));

  // Output file system
  this.fs = fs;
  if (this.opts.useMemoryFS) {
    this.fs = new MemoryFileSystem();
    this.compiler.outputFileSystem = this.fs;
  }
};

Watcher.prototype.defaultOptions = {
  aggregateTimeout: 200,
  poll: undefined,
  useMemoryFS: true
};

Watcher.prototype.watch = function watch() {
  this.isWatching = true;
  this.watcher = this.compiler.watch(
    {
      aggregateTimeout: this.opts.aggregateTimeout,
      poll: this.opts.poll
    },
    function() {/* no-op */}
  );
};

Watcher.prototype.onDone = function onDone(cb) {
  this._onDone.push(cb);
};

Watcher.prototype.onceDone = function onceDone(cb) {
  if (this.isReady && (this.err || this.stats)) {
    return cb(this.err, this.stats);
  }

  this._onceDone.push(cb);

  if (!this.isWatching) {
    this.watch();
  }
};

Watcher.prototype.onInvalid = function onInvalid(cb) {
  this._onInvalid.push(cb);
};

Watcher.prototype.invalidate = function invalidate() {
  this.compiler.applyPlugins('invalid');
};

Watcher.prototype.close = function close(cb) {
  if (this.watcher) {
    this.isWatching = false;
    this.watcher.close(cb);
  }
};

Watcher.prototype.handleDone = function handleDone(stats) {
  //this.isRunning = false;
  this.isReady = true;
  this.err = null;
  this.stats = null;

  // Defer in case the bundle has been invalidated
  // during the compilation process
  process.nextTick(function() {
    if (!this.isReady) return;

    if (stats.hasErrors()) {
      this.err = _.first(stats.compilation.errors);
    }
    this.stats = stats;

    this._onDone.forEach(function(cb) {
      cb(this.err, this.stats);
    }, this);

    var _onceDone = this._onceDone;
    this._onceDone = [];
    _onceDone.forEach(function(cb) {
      cb(this.err, this.stats);
    }, this);
  }.bind(this));
};

Watcher.prototype.handleInvalid = function handleInvalid() {
  //this.isRunning = false;
  this.isReady = false;
  this.err = null;
  this.stats = null;

  this._onInvalid.forEach(function(cb) {
    cb();
  });
};

Watcher.prototype.handleFailure = function handleFailure(err) {
  //this.isRunning = false;
  this.err = err;
  this.stats = null;
  console.error(err);
};

Watcher.prototype.writeAssets = function(cb) {
  if (this.err) return cb(this.err);
  if (!this.stats) return cb(new Error('Compilation has not completed successfully'));

  var filenames = _.pluck(_.values(this.stats.compilation.assets), 'existsAt');

  async.each(filenames,
    function(filename, cb) {
      this.fs.readFile(filename, function(err, data) {
        if (err) return cb(err);
        mkdirp(path.dirname(filename), function(err) {
          if (err) return cb(err);
          fs.writeFile(filename, data, cb);
        });
      });
    }.bind(this),
    function(err) {
      if (err) return cb(err);
      cb(null, filenames)
    }
  );
};

module.exports = Watcher;