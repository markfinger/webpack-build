'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

exports['default'] = function (name, opts) {
  var packageName = _package2['default'].name;
  var id = opts.buildHash.slice(0, 6);
  return (0, _debug2['default'])('' + packageName + ':' + id + ':' + name);
};

module.exports = exports['default'];
//# sourceMappingURL=index.js.map