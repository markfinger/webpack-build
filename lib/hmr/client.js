var socketIOClient = require('socket.io-client');
var stripAnsi = require('strip-ansi');

var opts = JSON.parse(__resourceQuery.slice(1));

var socket = socketIOClient(opts.root + opts.namespace, {
  path: opts.path
});

var currentHash = '';

var reload = function() {
  console.info('[WPW-HMR] Triggering HMR with hash ' + currentHash + '...');

  window.postMessage('webpackHotUpdate' + currentHash, '*');
};

socket.on('connect', function() {
  console.info('[WPW-HMR] Connected to ' + opts.root + opts.path + opts.namespace);
});

socket.on('hot', function() {
  console.info('[WPW-HMR] Hot Module Replacement enabled');
});

socket.on('invalid', function() {
  console.info('[WPW-HMR] Changes detected. Recompiling...');
});

socket.on('hash', function(hash) {
  currentHash = hash;
});

socket.on('no-change', function() {
  console.info('[WPW-HMR] Nothing changed')
});

socket.on('success', function() {
  console.info('[WPW-HMR] Compiler completed successfully');

  reload();
});

socket.on('warnings', function(warnings) {
  console.warn('[WPW-HMR] Warnings while compiling...');

  for (var i = 0; i < warnings.length; i++) {
    console.warn(stripAnsi(warnings[i]));
  }

  reload();
});

socket.on('errors', function(errors) {
  console.error('[WPW-HMR] Errors while compiling...');

  for (var i = 0; i < errors.length; i++) {
    console.error(stripAnsi(errors[i]));
  }

  reload();
});

socket.on('disconnect', function() {
  console.warn('[WPW-HMR] Disconnected');
});