'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _stripAnsi = require('strip-ansi');

var _stripAnsi2 = _interopRequireDefault(_stripAnsi);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var cleanError = function cleanError(err) {
  // Strips ansi sequences from the error's strings

  if (_lodash2['default'].isString(err)) {
    return (0, _stripAnsi2['default'])(err);
  }

  var error = {
    type: err.constructor.name,
    message: (0, _stripAnsi2['default'])(err.message)
  };

  if (err.stack) {
    error.stack = (0, _stripAnsi2['default'])(err.stack);
  }

  return error;
};

var processData = function processData(err, data) {
  // Processes data for communication between processes

  var error = null;
  if (err) {
    error = cleanError(err);
  }

  if (data && data.stats && data.stats.errors) {
    data.stats.errors = data.stats.errors.map(cleanError);
  }

  return {
    error: error,
    data: data || null
  };
};

exports['default'] = processData;
module.exports = exports['default'];
//# sourceMappingURL=process_data.js.map