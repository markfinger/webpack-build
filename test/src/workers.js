import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import Worker from '../../lib/workers/Worker';
import workers from '../../lib/workers';
import utils from './utils';

let assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  workers.killAll();
  utils.cleanTestOutputDir();
});
afterEach(() => {
  workers.killAll();
  utils.cleanTestOutputDir();
});

describe('workers', () => {
  it('should be able to spawn workers and indicate if any are available', () => {
    assert.isFalse(workers.available());
    assert.equal(workers.count(), 0);

    workers.spawn(1);

    assert.isTrue(workers.available());
    assert.equal(workers.count(), 1);
    assert.instanceOf(workers.workers[0], Worker);

    workers.spawn(2);

    assert.isTrue(workers.available());
    assert.equal(workers.count(), 3);
    assert.instanceOf(workers.workers[0], Worker);
    assert.instanceOf(workers.workers[1], Worker);
    assert.instanceOf(workers.workers[2], Worker);

    workers.killAll();

    assert.isFalse(workers.available());
    assert.equal(workers.count(), 0);
    assert.isUndefined(workers.workers[0]);
    assert.isUndefined(workers.workers[1]);
    assert.isUndefined(workers.workers[2]);
  });
  describe('#build', () => {
    it('should request a build from a worker', (done) => {
      workers.spawn(1);

      let opts = {
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      workers.build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        done();
      });
    });
    it('should produce errors if requests for a dead worker arrive', (done) => {
      workers.spawn(1);

      let opts = {
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      workers.build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        workers.workers[0].kill();

        workers.build(opts, (err, data) => {
          assert.instanceOf(err, Error);
          assert.isNull(data);

          done();
        });
      });
    });
  });
});