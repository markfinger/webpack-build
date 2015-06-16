"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var processData = function processData(err, data) {
  var error = null;
  if (err && err instanceof Error) {
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
exports.processData = processData;
//# sourceMappingURL=index.js.map