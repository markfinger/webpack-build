'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var webpackWrapper = require('..');
var Bundle = require('../lib/Bundle');
var utils = require('./utils');

var assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  webpackWrapper._bundles.clear();
  webpackWrapper._caches.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  webpackWrapper._bundles.clear();
  webpackWrapper._caches.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('webpack-wrapper', function() {
  it('should be a function', function() {
    assert.isFunction(webpackWrapper);
  });
  it('should accept options and callback arguments', function() {
    var opts = {
      config: require('./test_bundles/basic_bundle/webpack.config')
    };
    webpackWrapper(opts, function() {});
  });
  it('should populate the bundle list', function() {
    var pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true
    };
    assert.equal(webpackWrapper._bundles.bundles.length, 0);
    webpackWrapper(opts1, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 1);
    assert.instanceOf(webpackWrapper._bundles.bundles[0], Bundle);
    assert.strictEqual(webpackWrapper._bundles.bundles[0].opts, opts1);
    assert.strictEqual(webpackWrapper._bundles.bundles[0].config, require(pathToConfig));

    var opts2 = {
      config: pathToConfig,
      watch: true
    };
    webpackWrapper(opts2, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 1);
    assert.instanceOf(webpackWrapper._bundles.bundles[0], Bundle);
    assert.strictEqual(webpackWrapper._bundles.bundles[0].opts, opts1);
    assert.strictEqual(webpackWrapper._bundles.bundles[0].config, require(pathToConfig));

    var opts3 = {
      config: pathToConfig,
      watch: false
    };
    webpackWrapper(opts3, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 2);
    assert.instanceOf(webpackWrapper._bundles.bundles[1], Bundle);
    assert.strictEqual(webpackWrapper._bundles.bundles[1].opts, opts3);
    assert.strictEqual(webpackWrapper._bundles.bundles[1].config, require(pathToConfig));

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false
    };
    webpackWrapper(opts4, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 3);
    assert.instanceOf(webpackWrapper._bundles.bundles[2], Bundle);
    assert.strictEqual(webpackWrapper._bundles.bundles[2].opts, opts4);
    assert.strictEqual(webpackWrapper._bundles.bundles[2].config, null);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false
    };
    webpackWrapper(opts5, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true
    };
    webpackWrapper(opts6, function() {});
    assert.equal(webpackWrapper._bundles.bundles.length, 3);
  });
  it('should be able to generate a bundle', function(done) {
    webpackWrapper({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
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
  it('should pass the `this.host.logger` prop to bundles', function() {
    var logger = {};

    var bundle = webpackWrapper.call(
      {host: {logger: logger}},
      {},
      function(){}
    );

    assert.strictEqual(bundle.opts.logger, logger);
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

      webpackWrapper({
        config: configFile,
        cacheFile: cacheFile
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
          startTime: +new Date() - webpackWrapper._defaultCacheTTL - 1000
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

      webpackWrapper({
        config: configFile,
        cacheFile: cacheFile
      }, function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});

        var cache = webpackWrapper._caches.get(cacheFile);
        assert.equal(cache.ttl, webpackWrapper._defaultCacheTTL);
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
        watch: true
      };

      var bundle = webpackWrapper(opts, function(err, stats1) {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        webpackWrapper(opts, function(err, stats2) {
          assert.isNull(err);
          assert.isObject(stats2);
          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});

          var cache = webpackWrapper._caches.get(cacheFile);
          assert.strictEqual(bundle.cache, cache);

          bundle.onceDone(function(err, stats3) {
            assert.isNull(err);
            assert.isObject(stats3);
            assert.notStrictEqual(stats3, stats2);

            assert.isTrue(cache.updated[configFile]);

            webpackWrapper(opts, function(err, stats4) {
              assert.isNull(err);
              assert.isObject(stats4);
              assert.deepEqual(stats4, stats3);

              done();
            });
          });
        });
      });
    });
  });
});