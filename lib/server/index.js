'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _hmr = require('../hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _middleware = require('./middleware');

var _middleware2 = _interopRequireDefault(_middleware);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var app = (0, _express2['default'])();
var server = _http2['default'].Server(app);

app.use(_bodyParser2['default'].json());
app.use(_middleware2['default']);

_hmr2['default'].addToServer(server);

exports['default'] = server;
module.exports = exports['default'];
//# sourceMappingURL=index.js.map