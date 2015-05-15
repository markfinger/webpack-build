'use strict';

var path = require('path');
var chai = require('chai');
var spawnSync = require('spawn-sync');

var TEST_OUTPUT_DIR = path.join(__dirname, 'test_output');

chai.config.includeStack = true;

module.exports = {
  assert: chai.assert,
  TEST_OUTPUT_DIR: TEST_OUTPUT_DIR,
  cleanTestOutputDir: function() {
    spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
  },
  watchDelay: 10,
  watcherWarmUpWait: 50,
  watcherWait: 400
};