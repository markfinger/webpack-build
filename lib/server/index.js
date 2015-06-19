'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _hmr = require('../hmr');

var _hmr2 = _interopRequireDefault(_hmr);

var _endpoints = require('./endpoints');

var _endpoints2 = _interopRequireDefault(_endpoints);

var app = (0, _express2['default'])();
var server = _http2['default'].Server(app);

app.use(_bodyParser2['default'].json());

app.get('/', _endpoints2['default'].index);

app.post('/build', _endpoints2['default'].build);

_hmr2['default'].addToServer(server);

exports.endpoints = _endpoints2['default'];
exports.app = app;
exports.server = server;
exports['default'] = server;
//# sourceMappingURL=index.js.map