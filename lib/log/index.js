'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var log = function log(name, opts) {
  var namespace = log.namespace;

  if (opts) {
    var id = opts.buildHash.slice(0, 6);
    namespace = namespace + ':' + id + ':' + name;
  } else if (name) {
    namespace = namespace + ':' + name;
  }

  return (0, _debug2['default'])(namespace);
};

log.namespace = _package2['default'].name;

exports['default'] = log;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map