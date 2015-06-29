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

  if (fileTimestamps[configFile]) {
    var timestamp = undefined;
    try {
      timestamp = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }

    if (timestamp > fileTimestamps[configFile]) {
      return new Error('Config file has changed since being loaded into memory, the process will need to be restarted to apply the changes');
    }
  } else {
    try {
      require(configFile);
    } catch (err) {
      return err;
    }

    var timestamp = undefined;
    try {
      timestamp = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }

    fileTimestamps[configFile] = timestamp;
  }
};

exports['default'] = checkConfigFile;
module.exports = exports['default'];
//# sourceMappingURL=check_config_file.js.map