'use strict';

var path = require('path');
var chai = require('chai');
var child_process = require('child_process');

var TEST_OUTPUT_DIR = path.join(__dirname, 'test_output');

chai.config.includeStack = true;

var CI = !!process.env.TRAVIS;

module.exports = {
  assert: chai.assert,
  TEST_OUTPUT_DIR: TEST_OUTPUT_DIR,
  cleanTestOutputDir: function() {
    try {
      child_process.spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
    } catch(err) {}
  },
  aggregateTimeout: 10,
  watcherWarmUpWait: CI ? 1000 : 50,
  watcherWait: CI ? 1000 : 400,
  watcherTimeout: CI ? 10000 : 2000
};

if (CI) {
  console.log('Detected CI environment. Settings...', JSON.stringify(module.exports));
}