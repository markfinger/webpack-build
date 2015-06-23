import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import Worker from '../../lib/workers/Worker';
import options from '../../lib/options';
import utils from './utils';

let assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  utils.cleanTestOutputDir();
});
afterEach(() => {
  utils.cleanTestOutputDir();
});

describe('Worker', () => {
  it('should be a function', () => {
    assert.isFunction(Worker);
  });
  describe('#onReady', () => {
    it('should accept and call functions when the process is ready', (done) => {
      let worker = new Worker();

      // Sanity checks
      assert.isObject(worker.worker);
      assert.isFunction(worker.worker.send);

      worker.onReady((err) => {
        assert.isNull(err);

        worker.kill();
        done();
      });
    });
    it('should produce errors if requests for a dead worker arrive', (done) => {
      let worker = new Worker();

      worker.onReady((err) => {
        assert.isNull(err);

        worker.kill();

        setTimeout(() => {
          worker.onReady((err) => {
            assert.instanceOf(err, Error);
            worker.onReady((_err) => {
              assert.strictEqual(_err, err);

              done();
            });
          });
        }, 50);
      });
    });
  });
  describe('#getStatus', () => {
    it('should accept and call functions when the process is ready', (done) => {
      let worker = new Worker();

      worker.getStatus((err, status) => {
        assert.isNull(err);

        assert.equal(status, 'ok');

        worker.kill();
        done();
      });
    });
  });
  describe('#build', () => {
    it('should accept an options argument and provide the output from the build', (done) => {
      let worker = new Worker();

      worker.build({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      }, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        let existsAt = data.assets[0];
        assert.isString(existsAt);

        let contents = fs.readFileSync(existsAt).toString();
        assert.include(contents, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(contents, '__BASIC_BUNDLE_REQUIRE_TEST__');

        worker.kill();
        done();
      });
    });
    it('should handle errors', (done) => {
      let worker = new Worker();

      worker.build({
        config: path.join('/does/not/exist')
      }, (err, data) => {
        assert.isObject(err);
        assert.isString(err.type);
        assert.isString(err.message);
        assert.isString(err.stack);
        assert.isNull(data);

        worker.kill();
        done();
      });
    });
  });
});