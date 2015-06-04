'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var build = require('../lib');
var Wrapper = require('../lib/Wrapper');
var utils = require('./utils');

var assert = utils.assert;
var CACHE_DIR = path.join(utils.TEST_OUTPUT_DIR, 'cache_dir');

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  build.wrappers.clear();
  build.caches.clear();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  build.wrappers.clear();
  build.caches.clear();
  utils.cleanTestOutputDir();
});

describe('build', function() {
  it('should be a function', function() {
    assert.isFunction(build);
  });
  it('should accept options and callback arguments', function() {
    var opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts, function() {});
  });
  it('should populate the bundle list', function() {
    var pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    assert.equal(Object.keys(build.wrappers.wrappers).length, 0);

    var wrapper1 = build(opts1, function() {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 1);
    assert.strictEqual(build.wrappers.wrappers[opts1.hash], wrapper1);
    assert.strictEqual(build.wrappers.wrappers[opts1.hash].opts, opts1);

    var opts2 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    var wrapper2 = build(opts2, function() {});
    assert.strictEqual(wrapper2, wrapper1);
    assert.equal(Object.keys(build.wrappers.wrappers).length, 1);
    assert.strictEqual(build.wrappers.wrappers[opts2.hash], wrapper2);
    assert.strictEqual(build.wrappers.wrappers[opts2.hash].opts, opts1);

    var opts3 = {
      config: pathToConfig,
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    var wrapper3 = build(opts3, function() {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 2);
    assert.strictEqual(build.wrappers.wrappers[opts3.hash], wrapper3);
    assert.strictEqual(build.wrappers.wrappers[opts3.hash].opts, opts3);

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    var wrapper4 = build(opts4, function() {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);
    assert.strictEqual(build.wrappers.wrappers[opts4.hash], wrapper4);
    assert.strictEqual(build.wrappers.wrappers[opts4.hash].opts, opts4);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts5, function() {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts6, function() {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);
  });
  it('should be able to generate a bundle', function(done) {
    build({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null,
      cacheDir: CACHE_DIR
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
  describe('file cache', function() {
    it('should respect the cacheDir and cacheFile options', function(done) {
      var cacheFile = path.join(CACHE_DIR, 'test_cacheFile.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        stats: {
          test: {foo: 'bar'}
        },
        config: configFile,
        hash: 'foo'
      }));

      build({
        config: configFile,
        cacheFile: cacheFile,
        logger: null,
        hash: 'foo'
      }, function(err, stats){
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});
        done();
      });
    });
    it('should generate a cache file in the cache dir', function(done) {
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      var opts = {
        config: configFile,
        cacheDir: CACHE_DIR,
        logger: null
      };

      build(opts, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isString(opts.cacheFile);
        assert.include(opts.cacheFile, opts.cacheDir);

        done();
      });
    });
    it('should generate a cache file from the config file and options hash', function(done) {
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      var opts = {
        config: configFile,
        cacheDir: CACHE_DIR,
        logger: null
      };

      var wrapper = build(opts, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.strictEqual(wrapper.opts, opts);

        var cache = build.caches.get(opts);

        assert.isString(opts.config);
        assert.isString(opts.hash);
        assert.equal(opts.cacheFile, path.join(CACHE_DIR, opts.hash + '.json'));

        assert.equal(cache.filename, opts.cacheFile);

        done();
      });
    });
    it('should stop serving cached data once a watcher has completed', function(done) {
      var cacheFile = path.join(CACHE_DIR, 'test_cache_stops_once_watcher_done.json');
      var configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        stats: {
          test: {foo: 'bar'}
        },
        config: configFile,
        hash: 'foo'
      }));

      var opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        logger: null,
        hash: 'foo'
      };

      var wrapper = build(opts, function(err, stats1) {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        assert.strictEqual(wrapper.opts.cacheFile, cacheFile);

        var cache = build.caches.get(opts);
        assert.strictEqual(wrapper.cache, cache);
        assert.strictEqual(stats1, cache.data.stats);
        assert.isFalse(cache.delegate);

        build(opts, function(err, stats2) {
          assert.isNull(err);
          assert.isObject(stats2);

          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});
          assert.isFalse(cache.delegate);

          setTimeout(function() {
            wrapper.onceDone(function(err, stats3) {
              assert.isNull(err);
              assert.isObject(stats3);
              assert.notStrictEqual(stats3, stats2);

              assert.isString(cache.data.hash);
              assert.equal(cache.data.hash, opts.hash);
              assert.equal(cache.data.hash, wrapper.opts.hash);

              assert.isTrue(cache.delegate);

              build(opts, function(err, stats4) {
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