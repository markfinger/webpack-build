'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var TEST_OUTPUT_DIR = _path2['default'].join(__dirname, 'test_output');

_chai2['default'].config.includeStack = true;

var CI = !!process.env.TRAVIS;

module.exports = {
  assert: _chai2['default'].assert,
  TEST_OUTPUT_DIR: TEST_OUTPUT_DIR,
  cleanTestOutputDir: function cleanTestOutputDir() {
    try {
      _child_process2['default'].spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
    } catch (err) {}
  },
  aggregateTimeout: 10,
  watcherWarmUpWait: CI ? 1000 : 50,
  watcherWait: CI ? 1000 : 400,
  watcherTimeout: CI ? 10000 : 2000
};

if (CI) {
  console.log('Detected CI environment. Settings...', JSON.stringify(module.exports));
}
//# sourceMappingURL=utils.js.map