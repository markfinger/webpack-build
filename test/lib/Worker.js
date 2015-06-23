'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _libWorkersWorker = require('../../lib/workers/Worker');

var _libWorkersWorker2 = _interopRequireDefault(_libWorkersWorker);

var _libOptions = require('../../lib/options');

var _libOptions2 = _interopRequireDefault(_libOptions);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var assert = _utils2['default'].assert;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _utils2['default'].cleanTestOutputDir();
});

describe('Worker', function () {
  it('should be a function', function () {
    assert.isFunction(_libWorkersWorker2['default']);
  });
  describe('#onReady', function () {
    it('should accept and call functions when the process is ready', function (done) {
      var worker = new _libWorkersWorker2['default']();

      // Sanity checks
      assert.isObject(worker.worker);
      assert.isFunction(worker.worker.send);

      worker.onReady(function (err) {
        assert.isNull(err);

        worker.kill();
        done();
      });
    });
    it('should produce errors if requests for a dead worker arrive', function (done) {
      var worker = new _libWorkersWorker2['default']();

      worker.onReady(function (err) {
        assert.isNull(err);

        worker.kill();

        setTimeout(function () {
          worker.onReady(function (err) {
            assert.instanceOf(err, Error);
            worker.onReady(function (_err) {
              assert.strictEqual(_err, err);

              done();
            });
          });
        }, 50);
      });
    });
  });
  describe('#getStatus', function () {
    it('should accept and call functions when the process is ready', function (done) {
      var worker = new _libWorkersWorker2['default']();

      worker.getStatus(function (err, status) {
        assert.isNull(err);

        assert.equal(status, 'ok');

        worker.kill();
        done();
      });
    });
  });
  describe('#build', function () {
    it('should accept an options argument and provide the output from the build', function (done) {
      var worker = new _libWorkersWorker2['default']();

      worker.build({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      }, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        var existsAt = data.assets[0];
        assert.isString(existsAt);

        var contents = _fs2['default'].readFileSync(existsAt).toString();
        assert.include(contents, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(contents, '__BASIC_BUNDLE_REQUIRE_TEST__');

        worker.kill();
        done();
      });
    });
    it('should handle errors', function (done) {
      var worker = new _libWorkersWorker2['default']();

      worker.build({
        config: _path2['default'].join('/does/not/exist')
      }, function (err, data) {
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
//# sourceMappingURL=Worker.js.map