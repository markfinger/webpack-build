'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _libIndex = require('../../lib/index');

var _libIndex2 = _interopRequireDefault(_libIndex);

var _libWrappersWrapper = require('../../lib/wrappers/Wrapper');

var _libWrappersWrapper2 = _interopRequireDefault(_libWrappersWrapper);

var _libWrappers = require('../../lib/wrappers');

var _libWrappers2 = _interopRequireDefault(_libWrappers);

var _libWorkers = require('../../lib/workers');

var _libWorkers2 = _interopRequireDefault(_libWorkers);

var _libCaches = require('../../lib/caches');

var _libCaches2 = _interopRequireDefault(_libCaches);

var _libServer = require('../../lib/server');

var _libServer2 = _interopRequireDefault(_libServer);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var assert = _utils2['default'].assert;
var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _libWrappers2['default'].clear();
  _libCaches2['default'].clear();
  _libWorkers2['default'].killAll();
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _libWrappers2['default'].clear();
  _libCaches2['default'].clear();
  _libWorkers2['default'].killAll();
  _utils2['default'].cleanTestOutputDir();
});

describe('server', function () {
  it('should accept POST requests and pass them to `build`', function (done) {
    var opts = {
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    };
    (0, _request2['default'])('http://127.0.0.1:9009', function (err) {
      assert.instanceOf(err, Error, 'Sanity check to make sure there isn\'t another server running');

      _libServer2['default'].listen(9009, function () {
        _request2['default'].post({
          url: 'http://127.0.0.1:9009/build',
          json: true,
          body: opts
        }, function (err, res, body) {
          assert.isNull(err);
          assert.isObject(body);

          assert.isNull(body.error);
          assert.isObject(body.data);
          assert.equal(body.data.config.file, opts.config);

          _libServer2['default'].close();
          done();
        });
      });
    });
  });
  it('should accept GET requests and provide some info', function (done) {
    _libServer2['default'].listen(9009, function () {
      (0, _request2['default'])('http://127.0.0.1:9009', function (err, res, body) {
        assert.isNull(err);
        assert.isString(body);

        assert.include(body, '<html>');
        assert.include(body, 'webpack-build-server');

        _libServer2['default'].close();
        done();
      });
    });
  });
  it('should handle hmr', function (done) {
    var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_server_handles_hmr.js');

    _mkdirp2['default'].sync(TEST_OUTPUT_DIR);

    _fs2['default'].writeFileSync(configFile, '\n      module.exports = require(\'' + _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js') + '\');\n    ');

    var opts = {
      config: configFile,
      hmr: true,
      hmrRoot: 'http://example.com',
      publicPath: '/test'
    };

    _libServer2['default'].listen(9009, function () {
      _request2['default'].post({
        url: 'http://127.0.0.1:9009/build',
        json: true,
        body: opts
      }, function (err, res, body) {
        assert.isNull(err);
        assert.isObject(body);

        if (body.error) console.log(JSON.stringify(body.error));
        assert.isNull(body.error);
        assert.isObject(body.data);
        assert.equal(body.data.config.file, opts.config);

        _libServer2['default'].close();
        done();
      });
    });
  });
  it('should handle hmr with workers', function (done) {
    var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_server_handles_hmr_with_workers.js');

    _mkdirp2['default'].sync(TEST_OUTPUT_DIR);

    _fs2['default'].writeFileSync(configFile, '\n      module.exports = require(\'' + _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js') + '\');\n    ');

    var opts = {
      config: configFile,
      hmr: true,
      hmrRoot: 'http://example.com',
      publicPath: '/test'
    };

    _libWorkers2['default'].spawn(1);

    _libServer2['default'].listen(9009, function () {
      _request2['default'].post({
        url: 'http://127.0.0.1:9009/build',
        json: true,
        body: opts
      }, function (err, res, body) {
        assert.isNull(err);
        assert.isObject(body);

        assert.isNull(body.error);
        assert.isObject(body.data);
        assert.equal(body.data.config.file, opts.config);

        _libServer2['default'].close();
        done();
      });
    });
  });
});
//# sourceMappingURL=server.js.map