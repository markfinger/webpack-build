'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _caches = require('../caches');

var _caches2 = _interopRequireDefault(_caches);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

_cluster2['default'].setupMaster({
  exec: _path2['default'].join(__dirname, 'entry.js'),
  // Prevent the workers from running their own debugger
  args: _lodash2['default'].without(process.argv.slice(2), '--debug-brk', 'debug')
});

var Worker = (function () {
  function Worker() {
    _classCallCheck(this, Worker);

    this.err = null;
    this.isReady = false;
    this._onReady = [];
    this._onStatus = [];
    this._onBuild = Object.create(null);

    this.worker = _cluster2['default'].fork();
    this.id = this.worker.id;

    this.logger = (0, _log2['default'])('worker-manager:' + this.id);

    this.worker.on('message', this.handleMessage.bind(this));
    this.worker.on('error', this.handleError.bind(this));
    this.worker.on('exit', this.handleExit.bind(this));

    this.worker.process.on('exit', this.kill.bind(this));
    this.worker.process.on('uncaughtException', this.kill.bind(this));

    this.logger('started worker ' + this.id);
  }

  _createClass(Worker, [{
    key: 'build',
    value: function build(opts, cb) {
      var _this = this;

      opts = (0, _options2['default'])(opts);

      // Sanity checks
      if (!cb) throw new Error('No callback provided to build');
      if (!opts.buildHash) throw new Error('No buildHash defined');

      var buildHash = opts.buildHash;

      var buildRequests = this._onBuild[buildHash];
      if (!buildRequests) {
        buildRequests = this._onBuild[buildHash] = [];
      }

      buildRequests.push(cb);

      if (buildRequests.length === 1) {
        this.onReady(function (err) {
          if (err) {
            return _this._callBuildRequests(buildHash, err, null);
          }

          _this.logger('sending build request for ' + buildHash + ' to worker ' + _this.id);
          _this.worker.send({
            type: 'build',
            data: opts
          });
        });
      } else {
        this.logger('enqueuing build request for ' + buildHash + ', awaiting worker ' + this.id);
      }
    }
  }, {
    key: 'getStatus',
    value: function getStatus(cb) {
      var _this2 = this;

      this.onReady(function (err) {
        if (err) return cb(err);

        _this2._onStatus.push(cb);

        _this2.logger('sending status request to worker ' + _this2.id);
        _this2.worker.send({
          type: 'status'
        });
      });
    }
  }, {
    key: 'onReady',
    value: function onReady(cb) {
      this._onReady.push(cb);

      if (this.isReady || this.err) {
        this._callReady(this.err);
      }
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(msg) {
      if (!_lodash2['default'].isObject(msg)) {
        throw new Error('Malformed worker message: "' + msg + '"');
      }

      if (!msg.type) {
        throw new Error('Worker message lacks a type prop: ' + JSON.stringify(msg));
      }

      var type = msg.type;
      var data = msg.data;

      if (type === 'ready') {

        this.logger('worker ' + this.id + ' ready');
        this.isReady = true;
        this._callReady(null);
      } else if (type === 'status') {

        this.logger('worker ' + this.id + ' responded to status request');
        this._callStatusRequests(null, data);
      } else if (type === 'build') {
        var buildHash = data.buildHash;
        var buildData = data.buildData;

        this.logger('worker ' + this.id + ' responded to build request ' + buildHash);
        this._callBuildRequests(buildHash, buildData.error, buildData.data);
      } else if (type === 'cache') {
        var opts = data.opts;
        var cacheData = data.cacheData;

        this.logger('worker ' + this.id + ' sent a cache signal for build ' + opts.buildHash);
        _caches2['default'].set(opts, cacheData);

        // TODO hmr update support
      } else {
        throw new Error('Unknown message type "' + type + '" from worker ' + this.worker.id + ': ' + JSON.stringify(msg));
      }
    }
  }, {
    key: 'handleError',
    value: function handleError(err) {
      this.logger('worker process ' + this.id + ' error: ' + err);

      this.err = err;
      this.isReady = false;

      this._flushCallbacks(err);
    }
  }, {
    key: 'handleExit',
    value: function handleExit(code) {
      this.logger('worker process ' + this.id + ' exited with code ' + code);
      this.isReady = false;

      if (!this.err) {
        this.err = new Error('worker process ' + this.id + ' has already exited with code ' + code);
      }

      this._flushCallbacks(this.err);
    }
  }, {
    key: '_callReady',
    value: function _callReady(err) {
      var onReady = this._onReady;
      this._onReady = [];
      onReady.forEach(function (cb) {
        return cb(err);
      });
    }
  }, {
    key: '_callStatusRequests',
    value: function _callStatusRequests(err, data) {
      var onStatus = this._onStatus;
      this._onStatus = [];
      onStatus.forEach(function (cb) {
        return cb(err, data);
      });
    }
  }, {
    key: '_callBuildRequests',
    value: function _callBuildRequests(buildHash, err, data) {
      // Sanity checks
      if (!buildHash) {
        throw new Error('buildHash not defined. Received ' + buildHash + ' with ' + err + ' and ' + data);
      }
      if (!this._onBuild[buildHash]) {
        throw new Error('Unknown build hash ' + buildHash + ' in ' + JSON.stringify(this._onBuild));
      }

      var onBuild = this._onBuild[buildHash];
      this._onBuild[buildHash] = [];
      onBuild.forEach(function (cb) {
        return cb(err, data);
      });
    }
  }, {
    key: '_flushCallbacks',
    value: function _flushCallbacks(err) {
      this._callReady(err);
      this._callStatusRequests(err, null);
      for (var buildHash in this._onBuild) {
        this._callBuildRequests(buildHash, err, null);
      }
    }
  }, {
    key: 'kill',
    value: function kill() {
      if (!this.worker.isDead()) {
        this.logger('killing worker process ' + this.id);
        this.worker.kill();
      }
    }
  }]);

  return Worker;
})();

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=Worker.js.map