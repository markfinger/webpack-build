'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _build = require('./build');

var _build2 = _interopRequireDefault(_build);

var _hmr = require('./hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _env = require('./env');

var _env2 = _interopRequireDefault(_env);

_build2['default'].hmr = _hmr2['default'];
_build2['default'].env = _env2['default'];

exports['default'] = _build2['default'];
module.exports = exports['default'];
//# sourceMappingURL=index.js.map