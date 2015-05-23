'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var webpack = require('../lib');
var Wrapper = require('../lib/Wrapper');
var utils = require('./utils');

var assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  webpack._wrappers.clear();
  webpack._caches.clear();
  Wrapper._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  webpack._wrappers.clear();
  webpack._caches.clear();
  Wrapper._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('webpack-wrapper', function() {
  it('should be a function', function() {
    assert.isFunction(webpack);
  });
  it('should accept options and callback arguments', function() {
    var opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null
    };
    webpack(opts, function() {});
  });
  it('should populate the bundle list', function() {
    var pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    assert.equal(webpack._wrappers.wrappers.length, 0);
    webpack(opts1, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 1);
    assert.instanceOf(webpack._wrappers.wrappers[0], Wrapper);
    assert.strictEqual(webpack._wrappers.wrappers[0].opts, opts1);
    assert.strictEqual(webpack._wrappers.wrappers[0].config, require(pathToConfig));

    var opts2 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    webpack(opts2, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 1);
    assert.instanceOf(webpack._wrappers.wrappers[0], Wrapper);
    assert.strictEqual(webpack._wrappers.wrappers[0].opts, opts1);
    assert.strictEqual(webpack._wrappers.wrappers[0].config, require(pathToConfig));

    var opts3 = {
      config: pathToConfig,
      watch: false,
      logger: null
    };
    webpack(opts3, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 2);
    assert.instanceOf(webpack._wrappers.wrappers[1], Wrapper);
    assert.strictEqual(webpack._wrappers.wrappers[1].opts, opts3);
    assert.strictEqual(webpack._wrappers.wrappers[1].config, require(pathToConfig));

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    webpack(opts4, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 3);
    assert.instanceOf(webpack._wrappers.wrappers[2], Wrapper);
    assert.strictEqual(webpack._wrappers.wrappers[2].opts, opts4);
    assert.strictEqual(webpack._wrappers.wrappers[2].config, null);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    webpack(opts5, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    webpack(opts6, function() {});
    assert.equal(webpack._wrappers.wrappers.length, 3);
  });
  it('should be able to generate a bundle', function(done) {
    webpack({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null
    }, function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      assert.isObject(stats.pathsToAssets);
      assert.isObject(stats.webpackConfig);

      var existsAt = stats.pathsToAssets['output.js'];
      assert.isString(existsAt);

      fs.readFile(existsAt, function(err, contents) {
        assert.isNull(err);
        var compiledBundle = contents.toString();
        assert.include(compiledBundle, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledBundle, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  describe('cache', function() {
    it('should respect the cacheFile option', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_cacheFile.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      var obj = {};
      obj[configFile] = {
        startTime: +new Date() + 2000,
        fileDependencies: [],
        stats: {
          test: {foo: 'bar'}
        }
      };
      fs.writeFileSync(cacheFile, JSON.stringify(obj));

      webpack({
        config: configFile,
        cacheFile: cacheFile,
        logger: null
      }, function(err, stats){
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});
        done();
      });
    });
    it('should set a ttl on the cache', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_cacheTtl.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      var obj = {
        foo: {
          startTime: +new Date() - webpack._defaultCacheTTL - 1000
        }
      };
      obj[configFile] = {
        startTime: +new Date() + 2000,
        fileDependencies: [],
        stats: {
          test: {foo: 'bar'}
        }
      };
      fs.writeFileSync(cacheFile, JSON.stringify(obj));

      webpack({
        config: configFile,
        cacheFile: cacheFile,
        logger: null
      }, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});

        var cache = webpack._caches.get(cacheFile);
        assert.equal(cache.ttl, webpack._defaultCacheTTL);
        assert.isObject(cache.data[configFile]);
        assert.isUndefined(cache.data.foo);

        done();
      });
    });
    it('should stop using the cache once a watched bundle has been built', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      var obj = {};
      obj[configFile] = {
        startTime: +new Date() + 2000,
        fileDependencies: [],
        stats: {
          test: {foo: 'bar'}
        }
      };
      fs.writeFileSync(cacheFile, JSON.stringify(obj));

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        logger: null
      };

      var wrapper = webpack(opts, function(err, stats1) {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        webpack(opts, function(err, stats2) {
          assert.isNull(err);
          assert.isObject(stats2);
          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});

          var cache = webpack._caches.get(cacheFile);
          assert.strictEqual(wrapper.cache, cache);

          setTimeout(function() {
            wrapper.onceDone(function(err, stats3) {
              assert.isNull(err);
              assert.isObject(stats3);
              assert.notStrictEqual(stats3, stats2);

              assert.isTrue(cache.updated[configFile]);

              webpack(opts, function(err, stats4) {
                assert.isNull(err);
                assert.isObject(stats4);
                assert.deepEqual(stats4, stats3);

                done();
              });
            });
          }, 50);
        });
      });
    });
  });
});