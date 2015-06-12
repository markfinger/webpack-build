import _ from 'lodash';
import log from '../log';

class Watcher {
  constructor(compiler, opts) {
    this.opts = opts;
    this.logger = log('watcher', opts);

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
  }
  watch() {
    this.logger('starting compiler');
    this.isWatching = true;
    this.watcher = this.compiler.watch(
      {
        aggregateTimeout: this.opts.aggregateTimeout,
        poll: this.opts.poll
      },
      () => {/* no-op */}
    );
  }
  onDone(cb) {
    this._onDone.push(cb);
  }
  onceDone(cb) {
    if (this.isReady && (this.err || this.stats)) {
      return cb(this.err, this.stats);
    }

    this._onceDone.push(cb);

    if (!this.isWatching) {
      this.watch();
    }
  }
  onInvalid(cb) {
    this._onInvalid.push(cb);
  }
  onFailure(cb) {
    this._onFailure.push(cb);
  }
  invalidate() {
    this.compiler.applyPlugins('invalid');
  }
  close(cb) {
    if (this.watcher) {
      this.logger('closing watcher');
      this.isWatching = false;
      this.watcher.close(cb);
    }
  }
  handleDone(stats) {
    this.logger('done signal received');

    this.isReady = true;
    this.err = null;
    this.stats = null;

    // Defer in case the bundle has been invalidated
    // during the compilation process
    process.nextTick(() => {
      if (!this.isReady) return;

      if (stats.hasErrors()) {
        this.logger('errors encountered during compilation');
        this.err = _.first(stats.compilation.errors);
      }

      this.stats = stats;

      this.logger('passing data up');

      this._onDone.forEach(
        (cb) => cb(this.err, this.stats)
      );

      this.callOnceDone();
    });
  }
  callOnceDone() {
    let _onceDone = this._onceDone;
    this._onceDone = [];
    _onceDone.forEach(
      (cb) => cb(this.err, this.stats)
    );
  }
  handleInvalid() {
    this.logger('invalid signal received');

    this.isReady = false;
    this.err = null;
    this.stats = null;

    this._onInvalid.forEach((cb) => cb());
  }
  handleFailure(err) {
    this.logger('failure signal received', err);

    this.err = err;
    this.stats = null;

    this._onFailure.forEach((cb) => cb(err));

    this.callOnceDone();
  }
}

export default Watcher;