'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var fileTimestamps = Object.create(null);

var checkConfigFile = function checkConfigFile(opts) {
  var configFile = opts.config;

  if (!configFile) {
    return new Error('Config file not defined');
  }

  if (!_lodash2['default'].isString(configFile)) {
    return new Error('Config option must be a string');
  }

  var timestamp = undefined;
  try {
    timestamp = +_fs2['default'].statSync(configFile).mtime;
  } catch (err) {
    err.message = 'Cannot find config file ' + configFile + ': ' + err.message;
    return err;
  }

  if (!fileTimestamps[configFile]) {
    try {
      require(configFile);
    } catch (err) {
      err.message = 'Failed to import config file ' + configFile + ': ' + err.message;
      return err;
    }
    fileTimestamps[configFile] = timestamp;
  } else if (timestamp > fileTimestamps[configFile]) {
    return new Error('Config file has changed since being loaded into memory, the process will need to be restarted to apply the changes');
  }
};

exports['default'] = checkConfigFile;
module.exports = exports['default'];
//# sourceMappingURL=check_config_file.js.map