import path from 'path';
import chai from 'chai';
import child_process from 'child_process';

let TEST_OUTPUT_DIR = path.join(__dirname, 'test_output');

chai.config.includeStack = true;

let CI = !!process.env.TRAVIS;

module.exports = {
  assert: chai.assert,
  TEST_OUTPUT_DIR: TEST_OUTPUT_DIR,
  cleanTestOutputDir: () => {
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