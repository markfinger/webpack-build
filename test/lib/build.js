'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _lib = require('../../lib');

var _lib2 = _interopRequireDefault(_lib);

var _libWrappersWrapper = require('../../lib/wrappers/Wrapper');

var _libWrappersWrapper2 = _interopRequireDefault(_libWrappersWrapper);

var _libWrappers = require('../../lib/wrappers');

var _libWrappers2 = _interopRequireDefault(_libWrappers);

var _libWorkers = require('../../lib/workers');

var _libWorkers2 = _interopRequireDefault(_libWorkers);

var _libCaches = require('../../lib/caches');

var _libCaches2 = _interopRequireDefault(_libCaches);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;
var assert = _utils2['default'].assert;

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

describe('build', function () {
  it('should be a function', function () {
    assert.isFunction(_lib2['default']);
  });
  it('should accept options and callback arguments', function () {
    var opts = {
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    };
    (0, _lib2['default'])(opts, function () {});
  });
  it('should populate the wrappers list', function (done) {
    var basicBundle = _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');
    var libraryBundle = _path2['default'].join(__dirname, 'test_bundles', 'library_bundle', 'webpack.config.js');

    var opts1 = {
      config: basicBundle
    };
    assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);

    (0, _lib2['default'])(opts1, function () {});

    _lodash2['default'].defer(function () {
      assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 1);
      assert.strictEqual(_libWrappers2['default'].wrappers[opts1.buildHash].opts, opts1);

      var opts2 = {
        config: basicBundle
      };
      (0, _lib2['default'])(opts2, function () {});

      _lodash2['default'].defer(function () {
        assert.strictEqual(_libWrappers2['default'].wrappers[opts2.buildHash], _libWrappers2['default'].wrappers[opts1.buildHash]);
        assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 1);
        assert.strictEqual(_libWrappers2['default'].wrappers[opts2.buildHash].opts, opts1);

        var opts3 = {
          config: libraryBundle
        };
        (0, _lib2['default'])(opts3, function () {});

        _lodash2['default'].defer(function () {
          assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 2);
          assert.strictEqual(_libWrappers2['default'].wrappers[opts3.buildHash].opts, opts3);

          var opts4 = {
            config: basicBundle
          };
          (0, _lib2['default'])(opts4, function () {});

          _lodash2['default'].defer(function () {
            assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 2);
            assert.deepEqual(_libWrappers2['default'].wrappers[opts4.buildHash].opts, opts4);

            done();
          });
        });
      });
    });
  });
  it('should be able to generate a bundle', function (done) {
    (0, _lib2['default'])({
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
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
  it('should check mtimes to detect stale config files', function (done) {
    var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'stale_config_file.js');

    _mkdirp2['default'].sync(_path2['default'].dirname(configFile));
    _fs2['default'].writeFileSync(configFile, 'module.exports = function(){ return {}; }');
    var initialMTime = +_fs2['default'].statSync(configFile).mtime;

    (0, _lib2['default'])({
      config: configFile
    }, function (err, data) {
      assert.isNull(err);
      assert.isObject(data);

      // Need to delay due to file system accuracy issues
      setTimeout(function () {
        _fs2['default'].writeFileSync(configFile, 'module.exports = {test: 1}');
        assert.notEqual(+_fs2['default'].statSync(configFile).mtime, initialMTime);

        (0, _lib2['default'])({
          config: configFile
        }, function (err, data) {
          assert.instanceOf(err, Error);
          done();
        });
      }, 1000);
    });
  });
  it('should indicate if a config file does not exist', function (done) {
    var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'non_existent_config_file.js');

    assert.throws(function () {
      _fs2['default'].statSync(configFile);
    });

    (0, _lib2['default'])({
      config: configFile
    }, function (err, data) {
      assert.instanceOf(err, Error);
      assert.isNull(data);

      assert.include(err.message, 'Cannot find config file ' + configFile);

      done();
    });
  });
  it('should indicate if importing a config file produced errors', function (done) {
    var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'broken_config_file.js');

    _mkdirp2['default'].sync(_path2['default'].dirname(configFile));
    _fs2['default'].writeFileSync(configFile, 'require("package-that-does-not-exist");');

    (0, _lib2['default'])({
      config: configFile
    }, function (err, data) {
      assert.instanceOf(err, Error);
      assert.isNull(data);

      assert.include(err.message, 'Failed to import config file ' + configFile);

      done();
    });
  });
  it('should expose the default options', function () {
    assert.isFunction(_lib2['default'].options);
    assert.isObject(_lib2['default'].options.defaults);
    assert.isObject(_lib2['default'].options.defaults);
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
        config: {
          file: configFile
        },
        buildHash: 'foo',
        assets: []
      }));

      (0, _lib2['default'])({
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

      (0, _lib2['default'])(opts, function (err, data) {
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
        config: configFile
      };

      (0, _lib2['default'])(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.strictEqual(_libWrappers2['default'].wrappers[opts.buildHash].opts, opts);

        _libCaches2['default'].get(opts, function (_err, _data) {
          assert.isNull(_err);
          assert.deepEqual(_data, data);

          assert.isString(opts.config);
          assert.isString(opts.buildHash);
          assert.equal(opts.cacheFile, _path2['default'].join(opts.cacheDir, opts.buildHash + '.json'));

          assert.equal(_libCaches2['default']._caches.get(opts).filename, opts.cacheFile);

          done();
        });
      });
    });
    it('should stop serving cached data once a watcher has completed', function (done) {
      var cacheFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
      var configFile = _path2['default'].join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.js');

      _mkdirp2['default'].sync(TEST_OUTPUT_DIR);

      _fs2['default'].writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: { foo: 'bar' }
        },
        config: {
          file: configFile
        },
        buildHash: 'foo',
        assets: []
      }));

      _fs2['default'].writeFileSync(configFile, '\n        module.exports = require(\'' + _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js') + '\');\n      ');

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        buildHash: 'foo'
      };

      (0, _lib2['default'])(opts, function (err1, data1) {
        assert.isNull(err1);
        assert.isObject(data1);
        assert.deepEqual(data1.stats, { test: { foo: 'bar' } });

        var cache = _libCaches2['default']._caches.get(opts);
        assert.deepEqual(data1.stats, cache.data.stats);
        assert.isFalse(cache.delegate);

        (0, _lib2['default'])(opts, function (err2, data2) {
          assert.isNull(err2);
          assert.isObject(data2);

          assert.strictEqual(data2, data1);
          assert.deepEqual(data2.stats, { test: { foo: 'bar' } });
          assert.isFalse(cache.delegate);

          setTimeout(function () {
            var wrapper = _libWrappers2['default'].wrappers[opts.buildHash];

            wrapper.onceDone(function (err, data3) {
              assert.isNull(err);
              assert.isObject(data3);
              assert.notStrictEqual(data3, data2);

              assert.isString(cache.data.buildHash);
              assert.equal(cache.data.buildHash, opts.buildHash);
              assert.equal(cache.data.buildHash, wrapper.opts.buildHash);

              assert.isTrue(cache.delegate);

              (0, _lib2['default'])(opts, function (err, data4) {
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
  describe('workers', function () {
    it('should expose the workers', function () {
      assert.strictEqual(_lib2['default'].workers, _libWorkers2['default']);
    });
    it('should be used if they are available', function (done) {
      _lib2['default'].workers.spawn(2);

      assert.isTrue(_lib2['default'].workers.available());

      var opts = {
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);
      assert.equal(Object.keys(_libWorkers2['default'].matches).length, 0);
      assert.isUndefined(_libWorkers2['default'].match(opts));

      (0, _lib2['default'])(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);
        assert.equal(Object.keys(_libWorkers2['default'].matches).length, 1);
        assert.equal(_libWorkers2['default'].matches[opts.buildHash], _libWorkers2['default'].workers[0].id);
        assert.strictEqual(_libWorkers2['default'].match(opts), _libWorkers2['default'].workers[0]);

        (0, _lib2['default'])(opts, function (_err, _data) {
          assert.isNull(_err);
          assert.isObject(_data);

          assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);
          assert.equal(Object.keys(_libWorkers2['default'].matches).length, 1);
          assert.equal(_libWorkers2['default'].matches[opts.buildHash], _libWorkers2['default'].workers[0].id);
          assert.strictEqual(_libWorkers2['default'].match(opts), _libWorkers2['default'].workers[0]);

          assert.deepEqual(_data, data);

          done();
        });
      });
    });
    it('should populate the cache via signals', function (done) {
      _lib2['default'].workers.spawn();

      assert.isTrue(_lib2['default'].workers.available());

      var opts = {
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      (0, _lib2['default'])(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        setTimeout(function () {
          assert.equal(Object.keys(_libWrappers2['default'].wrappers).length, 0);
          var cache = _libCaches2['default']._caches.get(opts);
          assert.deepEqual(data, cache.data);

          done();
        }, 50);
      });
    });
  });
});
//# sourceMappingURL=build.js.map