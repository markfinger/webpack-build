'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var wrapper = require('../lib');
var Bundle = require('../lib/Bundle');
var utils = require('./utils');

var assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  wrapper._bundles.clear();
  wrapper._caches.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  wrapper._bundles.clear();
  wrapper._caches.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('webpack-wrapper', function() {
  it('should be a function', function() {
    assert.isFunction(wrapper);
  });
  it('should accept options and callback arguments', function() {
    var opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null
    };
    wrapper(opts, function() {});
  });
  it('should populate the bundle list', function() {
    var pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    assert.equal(wrapper._bundles.bundles.length, 0);
    wrapper(opts1, function() {});
    assert.equal(wrapper._bundles.bundles.length, 1);
    assert.instanceOf(wrapper._bundles.bundles[0], Bundle);
    assert.strictEqual(wrapper._bundles.bundles[0].opts, opts1);
    assert.strictEqual(wrapper._bundles.bundles[0].config, require(pathToConfig));

    var opts2 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    wrapper(opts2, function() {});
    assert.equal(wrapper._bundles.bundles.length, 1);
    assert.instanceOf(wrapper._bundles.bundles[0], Bundle);
    assert.strictEqual(wrapper._bundles.bundles[0].opts, opts1);
    assert.strictEqual(wrapper._bundles.bundles[0].config, require(pathToConfig));

    var opts3 = {
      config: pathToConfig,
      watch: false,
      logger: null
    };
    wrapper(opts3, function() {});
    assert.equal(wrapper._bundles.bundles.length, 2);
    assert.instanceOf(wrapper._bundles.bundles[1], Bundle);
    assert.strictEqual(wrapper._bundles.bundles[1].opts, opts3);
    assert.strictEqual(wrapper._bundles.bundles[1].config, require(pathToConfig));

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    wrapper(opts4, function() {});
    assert.equal(wrapper._bundles.bundles.length, 3);
    assert.instanceOf(wrapper._bundles.bundles[2], Bundle);
    assert.strictEqual(wrapper._bundles.bundles[2].opts, opts4);
    assert.strictEqual(wrapper._bundles.bundles[2].config, null);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null
    };
    wrapper(opts5, function() {});
    assert.equal(wrapper._bundles.bundles.length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true,
      logger: null
    };
    wrapper(opts6, function() {});
    assert.equal(wrapper._bundles.bundles.length, 3);
  });
  it('should be able to generate a bundle', function(done) {
    wrapper({
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

      wrapper({
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
          startTime: +new Date() - wrapper._defaultCacheTTL - 1000
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

      wrapper({
        config: configFile,
        cacheFile: cacheFile,
        logger: null
      }, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});

        var cache = wrapper._caches.get(cacheFile);
        assert.equal(cache.ttl, wrapper._defaultCacheTTL);
        assert.isObject(cache.cache[configFile]);
        assert.isUndefined(cache.cache.foo);

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

      var bundle = wrapper(opts, function(err, stats1) {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        wrapper(opts, function(err, stats2) {
          assert.isNull(err);
          assert.isObject(stats2);
          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});

          var cache = wrapper._caches.get(cacheFile);
          assert.strictEqual(bundle.cache, cache);

          setTimeout(function() {
            bundle.onceDone(function(err, stats3) {
              assert.isNull(err);
              assert.isObject(stats3);
              assert.notStrictEqual(stats3, stats2);

              assert.isTrue(cache.updated[configFile]);

              wrapper(opts, function(err, stats4) {
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