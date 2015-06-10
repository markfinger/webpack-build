'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Cache = require('./Cache');

var _Cache2 = _interopRequireDefault(_Cache);

var Caches = (function () {
  function Caches() {
    _classCallCheck(this, Caches);

    this.caches = Object.create(null);
  }

  _createClass(Caches, [{
    key: 'get',
    value: function get(opts) {
      if (!this.caches[opts.cacheFile]) {
        this.caches[opts.cacheFile] = new _Cache2['default'](opts);
      }

      return this.caches[opts.cacheFile];
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.caches = Object.create(null);
    }
  }]);

  return Caches;
})();

exports['default'] = new Caches();
module.exports = exports['default'];
//# sourceMappingURL=caches.js.map