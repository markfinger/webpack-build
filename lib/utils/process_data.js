"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var processData = function processData(err, data) {
  // Processes data for communication between processes

  var error = null;
  if (err && err.message) {
    error = {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack
    };
  }

  return {
    error: error,
    data: data || null
  };
};

exports["default"] = processData;
module.exports = exports["default"];
//# sourceMappingURL=process_data.js.map