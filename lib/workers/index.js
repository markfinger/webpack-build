'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _Worker = require('./Worker');

var _Worker2 = _interopRequireDefault(_Worker);

var Workers = (function () {
  function Workers() {
    _classCallCheck(this, Workers);

    this.workers = [];
    this.next = 0;
    this.matches = Object.create(null);
  }

  _createClass(Workers, [{
    key: 'available',
    value: function available() {
      return this.workers.length > 0;
    }
  }, {
    key: 'count',
    value: function count() {
      return this.workers.length;
    }
  }, {
    key: 'spawn',
    value: function spawn(number) {
      var _this = this;

      // Spawns the number of workers specified

      number = number || 1;

      _lodash2['default'].range(number).forEach(function () {
        _this.workers.push(new _Worker2['default']());
      });
    }
  }, {
    key: 'build',
    value: function build(opts, cb) {
      // Passes `opts` to an available worker

      opts = (0, _options2['default'])(opts);

      if (!this.available()) {
        return cb(new Error('No workers available'));
      }

      var worker = this.match(opts);
      if (!worker) {
        worker = this.get(worker);
        this.matches[opts.buildHash] = worker.id;
      }

      worker.build(opts, cb);
    }
  }, {
    key: 'match',
    value: function match(opts) {
      // Returns a worker, if any, which has previously built `opts` and is likely
      // to have a warm compiler or in-memory cache

      var key = opts.buildHash;
      var id = this.matches[key];
      if (id) {
        return _lodash2['default'].find(this.workers, { id: id });
      }
    }
  }, {
    key: 'get',
    value: function get() {
      // Returns the next available worker

      var worker = this.workers[this.next];

      this.next++;
      if (this.next >= this.workers.length) {
        this.next = 0;
      }

      return worker;
    }
  }, {
    key: 'clear',
    value: function clear() {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.workers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var worker = _step.value;

          worker.kill();
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.workers = [];
      this.matches = Object.create(null);
      this.next = 0;
    }
  }]);

  return Workers;
})();

exports['default'] = new Workers();
module.exports = exports['default'];
//# sourceMappingURL=index.js.map