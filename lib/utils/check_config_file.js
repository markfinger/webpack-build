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

var checkConfigFile = function checkConfigFile(configFile) {
  if (!configFile) {
    return new Error('Config file not defined');
  }

  if (!_lodash2['default'].isString(configFile)) {
    return new Error('Config file option must be a string');
  }

  if (fileTimestamps[configFile]) {
    var timestamp = undefined;
    try {
      timestamp = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }

    if (timestamp > fileTimestamps[configFile]) {
      return new Error('Config file has changed since being loaded into memory. Restart the process');
    }
  } else {
    try {
      require(configFile);
    } catch (err) {
      return err;
    }

    try {
      fileTimestamps[configFile] = +_fs2['default'].statSync(configFile).mtime;
    } catch (err) {
      return err;
    }
  }
};

exports['default'] = checkConfigFile;
module.exports = exports['default'];
//# sourceMappingURL=check_config_file.js.map