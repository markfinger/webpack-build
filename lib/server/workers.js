'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var logger = (0, _log2['default'])('worker:manager');

var workers = [];

exports.workers = workers;
var builds = {};

var nextWorker = -1;

var send = function send(opts, cb) {
  if (!workers.length) {
    return cb(new Error('No workers available'));
  }

  if (!builds[opts.buildHash]) {
    nextWorker++;
    if (nextWorker >= workers.length) {
      nextWorker = 0;
    }
    var worker = workers[nextWorker];
    builds[opts.buildHash] = {
      opts: opts,
      worker: worker,
      requests: []
    };
  }

  var build = builds[opts.buildHash];
  build.requests.push(cb);

  logger('sending build request ' + opts.buildHash + ' to worker ' + build.worker.pid);
  build.worker.send(opts);
};

exports.send = send;
var addWorker = function addWorker() {
  logger('spawning worker');
  var worker = _child_process2['default'].fork(_path2['default'].join(__dirname, 'worker.js'));

  var isReady = false;

  worker.on('message', function (obj) {
    if (isReady) {
      (function () {
        var opts = obj.opts;
        var data = obj.data;

        logger('worker ' + worker.pid + ' responded to build request ' + opts.buildHash);

        var build = builds[opts.buildHash];
        var requests = build.requests;
        build.requests = [];

        requests.forEach(function (cb) {
          return cb(null, data);
        });
      })();
    } else if (obj === 'ready') {
      isReady = true;
      workers.push(worker);
      logger('worker ' + worker.pid + ' ready');
    } else {
      throw new Error('Unexpected response from worker: "' + obj + '"');
    }
  });

  worker.on('error', function (err) {
    logger('worker process ' + worker.pid + ' error: ' + err);
  });

  worker.on('exit', function (code) {
    logger('worker process ' + worker.pid + ' exited with code ' + code);
    _lodash2['default'].remove(workers, worker);
  });
};
exports.addWorker = addWorker;
//# sourceMappingURL=workers.js.map