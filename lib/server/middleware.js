'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _views = require('./views');

exports['default'] = function (req, res, next) {
  if (req.method == 'GET') {
    return (0, _views.index)(req, res);
  } else if (req.method == 'POST') {
    return (0, _views.buildRequest)(req, res);
  }
  next();
};

module.exports = exports['default'];
//# sourceMappingURL=middleware.js.map