'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _libCachesCache = require('../../lib/caches/Cache');

var _libCachesCache2 = _interopRequireDefault(_libCachesCache);

var _libOptions = require('../../lib/options');

var _libOptions2 = _interopRequireDefault(_libOptions);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _webpackPackage = require('webpack/package');

var _webpackPackage2 = _interopRequireDefault(_webpackPackage);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var assert = _utils2['default'].assert;
var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _utils2['default'].cleanTestOutputDir();
});

describe('Cache', function () {
  it('should be a function', function () {
    assert.isFunction(_libCachesCache2['default']);
  });
  it('should accept a filename argument', function () {
    var filename = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_init_test.json');
    var cache = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename }));
    assert.equal(cache.filename, filename);
    assert.deepEqual(cache.data, {});
    cache.set(null);
    assert.equal(_fs2['default'].readFileSync(filename).toString(), 'null');
  });
  it('should be able to persist an entry to a file', function () {
    var cache = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: _path2['default'].join(TEST_OUTPUT_DIR, 'cache_persist.json') }));
    cache.set({ foo: { bar: 'woz' } });
    var json = require(TEST_OUTPUT_DIR + '/cache_persist.json');
    assert.deepEqual(json, { foo: { bar: 'woz' } });
  });
  it('should be able to read an entry from a file', function () {
    var filename = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_read.json');
    var testFile = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_read_test_file.js');
    var startTime = +new Date() + 2000;

    _mkdirp2['default'].sync(_path2['default'].dirname(filename));

    _fs2['default'].writeFileSync(filename, JSON.stringify({
      startTime: startTime,
      fileDependencies: [filename],
      stats: { test: 'bar' },
      config: {
        file: '/foo/bar'
      }
    }));

    _fs2['default'].writeFileSync(testFile, '{}');

    var cache = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename }), true);

    assert.equal(cache.filename, filename);
    assert.isObject(cache.data);
    assert.equal(cache.data.startTime, startTime);
    assert.deepEqual(cache.data.fileDependencies, [filename]);
    assert.deepEqual(cache.data.stats, { test: 'bar' });
    assert.equal(cache.data.config.file, '/foo/bar');
  });
  describe('#get', function () {
    it('should validate an entry\'s props', function (done) {
      var filename = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_prop_validate.json');
      var testFile = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_prop_validate_test_file.js');

      var startTime = +new Date();

      _mkdirp2['default'].sync(_path2['default'].dirname(filename));

      _fs2['default'].writeFileSync(filename, '{}');
      _fs2['default'].writeFileSync(testFile, '{}');

      var cache = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename }));

      cache.get(function (err, entry) {
        assert.isNull(err);
        assert.isNull(entry);

        cache.data = {
          startTime: startTime,
          fileDependencies: [],
          stats: {},
          config: {
            file: testFile
          },
          buildHash: 'foo',
          assets: [],
          dependencies: {
            webpack: _webpackPackage2['default'].version,
            'webpack-build': null
          }
        };

        cache.get(function (err, entry) {
          assert.isNull(err);
          assert.isNull(entry);

          cache.data.dependencies = {
            webpack: _webpackPackage2['default'].version,
            'webpack-build': _package2['default'].version
          };

          cache.get(function (err, entry) {
            assert.isNull(err);
            assert.isObject(entry);

            assert.strictEqual(entry, cache.data);

            done();
          });
        });
      });
    });
    it('should validate a config file\'s mtime', function (done) {
      var filename1 = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_file_mtime1.json');
      var filename2 = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_file_mtime2.json');
      var testFile = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_file_mtime_test_file.js');

      _mkdirp2['default'].sync(_path2['default'].dirname(filename1));

      _fs2['default'].writeFileSync(filename1, JSON.stringify({
        startTime: +new Date() - 1000,
        fileDependencies: [filename1],
        dependencies: {},
        stats: { test: 1 },
        config: {
          file: testFile
        },
        buildHash: 'foo1',
        assets: []
      }));

      _fs2['default'].writeFileSync(filename2, JSON.stringify({
        startTime: +new Date() + 1000,
        fileDependencies: [filename2],
        dependencies: {},
        stats: { test: 2 },
        config: {
          file: testFile
        },
        buildHash: 'foo2',
        assets: []
      }));

      _fs2['default'].writeFileSync(testFile, '{}');

      var cache1 = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename1 }));
      var cache2 = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename2 }));

      cache1.get(function (err, entry) {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Stale config file');
        assert.isUndefined(entry);

        cache2.get(function (err, entry) {
          assert.isNull(err);
          assert.isObject(entry);

          assert.strictEqual(entry, cache2.data);
          assert.equal(entry.stats.test, 2);

          done();
        });
      });
    });
  });
  describe('#set', function () {
    it('should persist to file', function () {
      var filename = _path2['default'].join(TEST_OUTPUT_DIR, 'cache_set.json');
      _mkdirp2['default'].sync(_path2['default'].dirname(filename));

      var cache = new _libCachesCache2['default']((0, _libOptions2['default'])({ cacheFile: filename }));

      cache.set({ foo: { bar: 'woz' } });

      var contents = _fs2['default'].readFileSync(filename).toString();

      assert.deepEqual(JSON.parse(contents), { foo: { bar: 'woz' } });
    });
  });
});
//# sourceMappingURL=Cache.js.map