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

var _libCache = require('../../lib/cache');

var _libCache2 = _interopRequireDefault(_libCache);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;
var assert = _utils2['default'].assert;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _libWrappers2['default'].clear();
  _libCache2['default'].clear();
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _libWrappers2['default'].clear();
  _libCache2['default'].clear();
  _utils2['default'].cleanTestOutputDir();
});

describe('build', function () {
  it('should be a function', function () {
    assert.isFunction(_libIndex2['default']);
  });
  it('should accept options and callback arguments', function () {
    var opts = {
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    };
    (0, _libIndex2['default'])(opts, function () {});
  });
  it('should populate the bundle list', function () {
    var pathToConfig = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true
    };
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);

    var wrapper1 = (0, _libIndex2['default'])(opts1, function () {});
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 1);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts1.buildHash], wrapper1);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts1.buildHash].opts, opts1);

    var opts2 = {
      config: pathToConfig,
      watch: true
    };
    var wrapper2 = (0, _libIndex2['default'])(opts2, function () {});
    assert.strictEqual(wrapper2, wrapper1);
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 1);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts2.buildHash], wrapper2);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts2.buildHash].opts, opts1);

    var opts3 = {
      config: pathToConfig,
      watch: false
    };
    var wrapper3 = (0, _libIndex2['default'])(opts3, function () {});
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 2);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts3.buildHash], wrapper3);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts3.buildHash].opts, opts3);

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false
    };
    var wrapper4 = (0, _libIndex2['default'])(opts4, function () {});
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 3);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts4.buildHash], wrapper4);
    assert.strictEqual(_libWrappers2['default'].wrappers[opts4.buildHash].opts, opts4);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false
    };
    (0, _libIndex2['default'])(opts5, function () {});
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true
    };
    (0, _libIndex2['default'])(opts6, function () {});
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 3);
  });
  it('should be able to generate a bundle', function (done) {
    (0, _libIndex2['default'])({
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    }, function (err, data) {
      assert.isNull(err);
      assert.isObject(data);

      assert.isArray(data.assets);
      assert.isObject(data.outputOptions);

      var existsAt = data.assets[0];
      assert.isString(existsAt);

      _fs2['default'].readFile(existsAt, function (err, contents) {
        assert.isNull(err);
        var compiledBundle = contents.toString();
        assert.include(compiledBundle, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledBundle, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  describe('file cache', function () {
    it('should respect the cacheDir and cacheFile options', function (done) {
      var cacheFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_cacheFile.json');
      var configFile = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      _mkdirp2['default'].sync(_path2['default'].dirname(cacheFile));

      _fs2['default'].writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: { foo: 'bar' }
        },
        config: configFile,
        buildHash: 'foo',
        assets: []
      }));

      (0, _libIndex2['default'])({
        config: configFile,
        cacheFile: cacheFile,
        buildHash: 'foo'
      }, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.deepEqual(data.stats, { test: { foo: 'bar' } });
        done();
      });
    });
    it('should generate a cache file in the cache dir', function (done) {
      var configFile = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      var opts = {
        config: configFile
      };

      (0, _libIndex2['default'])(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.isString(opts.cacheFile);
        assert.include(opts.cacheFile, opts.cacheDir);

        done();
      });
    });
    it('should generate a cache file from the config file and options hash', function (done) {
      var configFile = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      var opts = {
        config: configFile,
        watch: false
      };

      var wrapper = (0, _libIndex2['default'])(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.strictEqual(wrapper.opts, opts);

        _libCache2['default'].get(opts, function (_err, _data) {
          assert.isNull(_err);
          assert.deepEqual(_data, data);

          assert.isString(opts.config);
          assert.isString(opts.buildHash);
          assert.equal(opts.cacheFile, _path2['default'].join(opts.cacheDir, opts.buildHash + '.json'));

          assert.equal(_libCache2['default']._caches.get(opts).filename, opts.cacheFile);

          done();
        });
      });
    });
    it('should stop serving cached data once a watcher has completed', function (done) {
      var cacheFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
      var configFile = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      _mkdirp2['default'].sync(_path2['default'].dirname(cacheFile));

      _fs2['default'].writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: { foo: 'bar' }
        },
        config: configFile,
        buildHash: 'foo',
        assets: []
      }));

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        buildHash: 'foo'
      };

      var wrapper = (0, _libIndex2['default'])(opts, function (err, data1) {
        assert.isNull(err);
        assert.isObject(data1);
        assert.deepEqual(data1.stats, { test: { foo: 'bar' } });

        assert.strictEqual(wrapper.opts.cacheFile, cacheFile);

        var _cache = _libCache2['default']._caches.get(opts);
        assert.deepEqual(data1.stats, _cache.data.stats);
        assert.isFalse(_cache.delegate);

        (0, _libIndex2['default'])(opts, function (err, data2) {
          assert.isNull(err);
          assert.isObject(data2);

          assert.strictEqual(data2, data1);
          assert.deepEqual(data2.stats, { test: { foo: 'bar' } });
          assert.isFalse(_cache.delegate);

          setTimeout(function () {
            wrapper.onceDone(function (err, data3) {
              assert.isNull(err);
              assert.isObject(data3);
              assert.notStrictEqual(data3, data2);

              assert.isString(_cache.data.buildHash);
              assert.equal(_cache.data.buildHash, opts.buildHash);
              assert.equal(_cache.data.buildHash, wrapper.opts.buildHash);

              assert.isTrue(_cache.delegate);

              (0, _libIndex2['default'])(opts, function (err, data4) {
                assert.isNull(err);
                assert.isObject(data4);
                assert.deepEqual(data4.stats, data3.stats);

                done();
              });
            });
          }, 50);
        });
      });
    });
  });
});
//# sourceMappingURL=build.js.map