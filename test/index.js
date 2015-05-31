'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var webpack = require('../lib');
var Wrapper = require('../lib/Wrapper');
var options = require('../lib/options');
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

describe('index', function() {
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
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 0);

    var wrapper1 = webpack(opts1, function() {});
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 1);
    assert.strictEqual(webpack._wrappers.wrappers[opts1.hash], wrapper1);
    assert.strictEqual(webpack._wrappers.wrappers[opts1.hash].opts, opts1);
    assert.strictEqual(webpack._wrappers.wrappers[opts1.hash].config, require(pathToConfig));

    var opts2 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    var wrapper2 = webpack(opts2, function() {});
    assert.strictEqual(wrapper2, wrapper1);
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 1);
    assert.strictEqual(webpack._wrappers.wrappers[opts2.hash], wrapper2);
    assert.strictEqual(webpack._wrappers.wrappers[opts2.hash].opts, opts1);
    assert.strictEqual(webpack._wrappers.wrappers[opts2.hash].config, require(pathToConfig));

    var opts3 = {
      config: pathToConfig,
      watch: false,
      logger: null
    };
    var wrapper3 = webpack(opts3, function() {});
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 2);
    assert.strictEqual(webpack._wrappers.wrappers[opts3.hash], wrapper3);
    assert.strictEqual(webpack._wrappers.wrappers[opts3.hash].opts, opts3);
    assert.strictEqual(webpack._wrappers.wrappers[opts3.hash].config, require(pathToConfig));

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    var wrapper4 = webpack(opts4, function() {});
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 3);
    assert.strictEqual(webpack._wrappers.wrappers[opts4.hash], wrapper4);
    assert.strictEqual(webpack._wrappers.wrappers[opts4.hash].opts, opts4);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    webpack(opts5, function() {});
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    webpack(opts6, function() {});
    assert.equal(Object.keys(webpack._wrappers.wrappers).length, 3);
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
    it('should respect the cacheFile and cacheKey options', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_cacheFile.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        testKey: {
          startTime: +new Date() + 2000,
          fileDependencies: [],
          stats: {
            test: {foo: 'bar'}
          },
          config: configFile
        }
      }));

      webpack({
        config: configFile,
        cacheFile: cacheFile,
        cacheKey: 'testKey',
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

      fs.writeFileSync(cacheFile, JSON.stringify({
        foo: {
          startTime: +new Date() - options.defaults.cacheTTL - 1000
        },
        bar: {
          startTime: +new Date() + 2000,
          fileDependencies: [],
          stats: {
            test: {foo: 'bar'}
          },
          config: configFile
        }
      }));

      webpack({
        config: configFile,
        cacheFile: cacheFile,
        cacheKey: 'bar',
        logger: null
      }, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});

        var cache = webpack._caches.get(cacheFile);
        assert.equal(cache.ttl, options.defaults.cacheTTL);
        assert.isUndefined(cache.data.foo);
        assert.isObject(cache.data.bar);
        assert.strictEqual(cache.data.bar.stats, stats);

        done();
      });
    });
    it('should accept a falsey value for the ttl', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_falsey_cacheTtl.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        foo: {
          startTime: 1
        }
      }));

      webpack({
        config: configFile,
        cacheFile: cacheFile,
        cacheKey: 'foo',
        cacheTTL: null,
        logger: null
      }, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        var cache = webpack._caches.get(cacheFile);
        assert.equal(cache.ttl, null);
        assert.isObject(cache.data.foo);

        done();
      });
    });
    it('should generate a cache key from the config file and options hash', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_default_cache_key_default_generation.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        logger: null
      };

      var wrapper = webpack(opts, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.strictEqual(wrapper.opts, opts);

        var cache = webpack._caches.get(cacheFile);

        assert.isString(opts.config);
        assert.isString(opts.cacheKey);
        assert.isString(opts.hash);
        assert.equal(opts.cacheKey, configFile + '__' + opts.hash);

        assert.isObject(cache.data[wrapper.opts.cacheKey]);

        done();
      });
    });
    it('should stop using the cache once a watched bundle has been built', function(done) {
      var cacheFile = path.join(utils.TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        testKey: {
          startTime: +new Date() + 2000,
          fileDependencies: [],
          stats: {
            test: {foo: 'bar'}
          },
          config: configFile
        }
      }));

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        cacheKey: 'testKey',
        watch: true,
        logger: null
      };

      var wrapper = webpack(opts, function(err, stats1) {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        var cache = webpack._caches.get(cacheFile);
        assert.strictEqual(wrapper.cache, cache);
        assert.strictEqual(wrapper.opts.cacheKey, 'testKey');
        assert.strictEqual(stats1, cache.data.testKey.stats);
        assert.isUndefined(cache.updated.testKey);

        webpack(opts, function(err, stats2) {
          assert.isNull(err);
          assert.isObject(stats2);

          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});
          assert.isUndefined(cache.updated.testKey);

          setTimeout(function() {
            wrapper.onceDone(function(err, stats3) {
              assert.isNull(err);
              assert.isObject(stats3);
              assert.notStrictEqual(stats3, stats2);

              assert.isString(cache.data.testKey.optsHash);
              assert.equal(cache.data.testKey.optsHash, opts.hash);
              assert.equal(cache.data.testKey.optsHash, wrapper.opts.hash);

              assert.isTrue(cache.updated['testKey']);

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