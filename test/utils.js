'use strict';

var path = require('path');
var chai = require('chai');
var spawnSync = require('spawn-sync');
var Bundle = require('../lib/Bundle');

var TEST_OUTPUT_DIR = path.join(__dirname, 'test_output');

chai.config.includeStack = true;

var CI = !!process.env.TRAVIS;

if (CI) {
  console.log('Detected CI environment. Tweaking settings...');
}

module.exports = {
  assert: chai.assert,
  TEST_OUTPUT_DIR: TEST_OUTPUT_DIR,
  cleanTestOutputDir: function() {
    spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
  },
  watchDelay: 10,
  watcherWarmUpWait: CI ? 1000 : 50,
  watcherWait: CI ? 1000 : 400,
  watcherTimeout: CI ? 10000 : 2000
};