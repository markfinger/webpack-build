'use strict';

var _ = require('lodash');
var logger = require('./logger');

var Watcher = function Watcher(compiler, opts) {
  this.opts = opts;
  this.logger = logger('watcher', opts);

  // Callback stores
  this._onDone = []; // function(err, stats) {}
  this._onceDone = []; // function(err, stats) {}
  this._onInvalid = []; // function() {}
  this._onFailure = []; // function(err) {}

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
  this.logger('started watching');
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

Watcher.prototype.onFailure = function onFailure(cb) {
  this._onFailure.push(cb);
};

Watcher.prototype.invalidate = function invalidate() {
  this.compiler.applyPlugins('invalid');
};

Watcher.prototype.close = function close(cb) {
  if (this.watcher) {
    this.logger('closing watcher');
    this.isWatching = false;
    this.watcher.close(cb);
  }
};

Watcher.prototype.handleDone = function handleDone(stats) {
  this.logger('done signal received');

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

    this.callOnceDone();
  }.bind(this));
};

Watcher.prototype.callOnceDone = function callOnceDone() {
  var _onceDone = this._onceDone;
  this._onceDone = [];
  _onceDone.forEach(function(cb) {
    cb(this.err, this.stats);
  }, this);
};

Watcher.prototype.handleInvalid = function handleInvalid() {
  this.logger('invalid signal received');

  this.isReady = false;
  this.err = null;
  this.stats = null;

  this._onInvalid.forEach(function(cb) {
    cb();
  });
};

Watcher.prototype.handleFailure = function handleFailure(err) {
  this.logger('failure signal received', err);

  this.err = err;
  this.stats = null;

  this._onFailure.forEach(function(cb) {
    cb(err);
  });

  this.callOnceDone();
};

module.exports = Watcher;