'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _log = require('../log');

var _log2 = _interopRequireDefault(_log);

var _compile = require('../compile');

var _compile2 = _interopRequireDefault(_compile);

var _utilsProcess_data = require('../utils/process_data');

var _utilsProcess_data2 = _interopRequireDefault(_utilsProcess_data);

_sourceMapSupport2['default'].install();

if (!_cluster2['default'].isWorker) {
  throw new Error(__filename + ' should only be used by workers');
}

_log2['default'].namespace += ':worker-' + _cluster2['default'].worker.id;

var logger = (0, _log2['default'])();

logger('ready');

process.send({
  type: 'ready'
});

process.on('message', function (msg) {
  var type = msg.type;
  var data = msg.data;

  if (type === 'status') {
    logger('status request received');
    process.send({
      type: 'status',
      data: 'ok'
    });
  } else if (type === 'build') {
    logger('build request received for ' + data.buildHash);

    (0, _compile2['default'])(data, function (err, _data) {
      process.send({
        type: 'build',
        data: {
          buildHash: data.buildHash,
          buildData: (0, _utilsProcess_data2['default'])(err, _data)
        }
      });
    });
  } else {
    throw new Error('Unknown request received ' + msg);
  }
});
//# sourceMappingURL=entry.js.map