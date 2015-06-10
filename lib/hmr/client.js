'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _socketIoClient = require('socket.io-client');

var _socketIoClient2 = _interopRequireDefault(_socketIoClient);

var _stripAnsi = require('strip-ansi');

var _stripAnsi2 = _interopRequireDefault(_stripAnsi);

var opts = JSON.parse(__resourceQuery.slice(1));

var socket = (0, _socketIoClient2['default'])(opts.root + opts.namespace, {
  path: opts.path
});

var currentHash = '';

var reload = function reload() {
  console.info('[WPB-HMR] Triggering HMR with hash ' + currentHash + '...');

  window.postMessage('webpackHotUpdate' + currentHash, '*');
};

socket.on('connect', function () {
  return console.info('[WPB-HMR] Connected to ' + opts.root + '' + opts.path + '' + opts.namespace);
});

socket.on('hot', function () {
  return console.info('[WPB-HMR] Hot Module Replacement enabled');
});

socket.on('invalid', function () {
  return console.info('[WPB-HMR] Changes detected. Recompiling...');
});

socket.on('hash', function (hash) {
  return currentHash = hash;
});

socket.on('no-change', function () {
  return console.info('[WPB-HMR] Nothing changed');
});

socket.on('success', function () {
  console.info('[WPB-HMR] Compiler completed successfully');
  reload();
});

socket.on('warnings', function (warnings) {
  console.warn('[WPB-HMR] Warnings while compiling...');

  for (var i = 0; i < warnings.length; i++) {
    console.warn((0, _stripAnsi2['default'])(warnings[i]));
  }

  reload();
});

socket.on('errors', function (errors) {
  console.error('[WPB-HMR] Errors while compiling...');

  for (var i = 0; i < errors.length; i++) {
    console.error((0, _stripAnsi2['default'])(errors[i]));
  }

  reload();
});

socket.on('disconnect', function () {
  console.warn('[WPB-HMR] Disconnected');
});
//# sourceMappingURL=client.js.map