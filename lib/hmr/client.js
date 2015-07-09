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

var reload = function reload() {
  console.info('[WPB-HMR] Triggering HMR with hash ' + currentHash + '...');

  window.postMessage('webpackHotUpdate' + currentHash, '*');
};

// Socket handling

socket.on('connect', function () {
  return console.info('[WPB-HMR] Connected to ' + opts.root + opts.path + opts.namespace);
});

socket.on('error', function (err) {
  return console.error('[WPB-HMR] Connection error to ' + opts.root + opts.path + opts.namespace, err);
});

socket.on('disconnect', function () {
  return console.warn('[WPB-HMR] Disconnected');
});

socket.on('reconnect', function (attempt) {
  return console.info('[WPB-HMR] Reconnected on attempt ' + attempt);
});

socket.on('reconnecting', function () {
  return console.info('[WPB-HMR] Attempting to reconnect');
});

// HMR handling

var currentHash = '';

socket.on('hot', function () {
  return console.info('[WPB-HMR] Hot Module Replacement enabled');
});

socket.on('invalid', function () {
  return console.info('[WPB-HMR] Changes detected. Recompiling...');
});

socket.on('hash', function (hash) {
  currentHash = hash;
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

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = warnings[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var warning = _step.value;

      console.warn((0, _stripAnsi2['default'])(warning));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator['return']) {
        _iterator['return']();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  reload();
});

socket.on('errors', function (errors) {
  console.error('[WPB-HMR] Errors while compiling...');

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = errors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var error = _step2.value;

      console.warn((0, _stripAnsi2['default'])(error));
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2['return']) {
        _iterator2['return']();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  reload();
});
//# sourceMappingURL=client.js.map