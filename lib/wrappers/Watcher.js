'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var Watcher = (function () {
  function Watcher(compiler, opts) {
    _classCallCheck(this, Watcher);

    this.opts = opts;
    this.logger = (0, _log2['default'])('watcher', opts);

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

  _createClass(Watcher, [{
    key: 'watch',
    value: function watch() {
      this.logger('starting compiler');
      this.isWatching = true;
      this.watcher = this.compiler.watch({
        aggregateTimeout: this.opts.aggregateTimeout,
        poll: this.opts.poll
      }, function () {/* no-op */});
    }
  }, {
    key: 'onDone',
    value: function onDone(cb) {
      this._onDone.push(cb);
    }
  }, {
    key: 'onceDone',
    value: function onceDone(cb) {
      if (this.isReady && (this.err || this.stats)) {
        return cb(this.err, this.stats);
      }

      this._onceDone.push(cb);

      if (!this.isWatching) {
        this.watch();
      }
    }
  }, {
    key: 'onInvalid',
    value: function onInvalid(cb) {
      this._onInvalid.push(cb);
    }
  }, {
    key: 'onFailure',
    value: function onFailure(cb) {
      this._onFailure.push(cb);
    }
  }, {
    key: 'invalidate',
    value: function invalidate() {
      this.compiler.applyPlugins('invalid');
    }
  }, {
    key: 'close',
    value: function close(cb) {
      if (this.watcher) {
        this.logger('closing watcher');
        this.isWatching = false;
        this.watcher.close(cb);
      }
    }
  }, {
    key: 'handleDone',
    value: function handleDone(stats) {
      var _this = this;

      this.logger('done signal received');

      this.isReady = true;
      this.err = null;
      this.stats = null;

      // Defer in case the bundle has been invalidated
      // during the compilation process
      process.nextTick(function () {
        if (!_this.isReady) return;

        if (stats.hasErrors()) {
          _this.logger('errors encountered during compilation');
          _this.err = _lodash2['default'].first(stats.compilation.errors);
        }

        _this.stats = stats;

        _this.logger('passing data up');

        _this._onDone.forEach(function (cb) {
          return cb(_this.err, _this.stats);
        });

        _this.callOnceDone();
      });
    }
  }, {
    key: 'callOnceDone',
    value: function callOnceDone() {
      var _this2 = this;

      var _onceDone = this._onceDone;
      this._onceDone = [];
      _onceDone.forEach(function (cb) {
        return cb(_this2.err, _this2.stats);
      });
    }
  }, {
    key: 'handleInvalid',
    value: function handleInvalid() {
      this.logger('invalid signal received');

      this.isReady = false;
      this.err = null;
      this.stats = null;

      this._onInvalid.forEach(function (cb) {
        return cb();
      });
    }
  }, {
    key: 'handleFailure',
    value: function handleFailure(err) {
      this.logger('failure signal received', err);

      this.err = err;
      this.stats = null;

      this._onFailure.forEach(function (cb) {
        return cb(err);
      });

      this.callOnceDone();
    }
  }]);

  return Watcher;
})();

exports['default'] = Watcher;
module.exports = exports['default'];
//# sourceMappingURL=Watcher.js.map