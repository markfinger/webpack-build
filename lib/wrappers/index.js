'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Wrapper = require('./Wrapper');

var _Wrapper2 = _interopRequireDefault(_Wrapper);

var Wrappers = (function () {
  function Wrappers() {
    _classCallCheck(this, Wrappers);

    this.wrappers = Object.create(null);
  }

  _createClass(Wrappers, [{
    key: 'add',
    value: function add(wrapper) {
      this.wrappers[wrapper.opts.buildHash] = wrapper;
    }
  }, {
    key: 'get',
    value: function get(opts) {
      var wrapper = this.wrappers[opts.buildHash];

      if (!wrapper) {
        wrapper = new _Wrapper2['default'](opts);
        this.add(wrapper);
      }

      return wrapper;
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.wrappers = Object.create(null);
    }
  }]);

  return Wrappers;
})();

exports['default'] = new Wrappers();
module.exports = exports['default'];
//# sourceMappingURL=index.js.map