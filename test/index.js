var fs = require('fs');
var path = require('path');
var spawnSync = require('spawn-sync'); // node 0.10.x compatibility
var _ = require('lodash');
var mkdirp = require('mkdirp');
var assert = require('chai').assert;
var webpackService = require('..');
var cache = require('../lib/cache');
var Bundle = require('../lib/Bundle');

var TEST_OUTPUT_DIR = path.join(__dirname, 'index_test_output');

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  cache.clear();
  Bundle._resetFileWatcher();
  // The file watcher seems to be really inconsistent unless we punch in a
  // random file before we start using it
  Bundle._fileWatcher.add(module.filename);
  spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
});
afterEach(function() {
  cache.clear();
  Bundle._resetFileWatcher();
  spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
});

describe('webpack-service', function() {
  it('is a function', function() {
    assert.isFunction(webpackService);
  });
  it('can accept options and callback arguments', function() {
    var opts = {
      config: require('./test_bundles/basic_bundle/webpack.config')
    };
    webpackService(opts, function() {});
  });
  it('populates the cache', function() {
    var pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    var opts1 = {
      config: pathToConfig,
      watch: true
    };
    assert.equal(cache._cache.length, 0);
    webpackService(opts1, function() {});
    assert.equal(cache._cache.length, 1);
    assert.instanceOf(cache._cache[0], Bundle);
    assert.strictEqual(cache._cache[0].opts, opts1);
    assert.strictEqual(cache._cache[0].config, require(pathToConfig));

    var opts2 = {
      config: pathToConfig,
      watch: true
    };
    webpackService(opts2, function() {});
    assert.equal(cache._cache.length, 1);
    assert.instanceOf(cache._cache[0], Bundle);
    assert.strictEqual(cache._cache[0].opts, opts1);
    assert.strictEqual(cache._cache[0].config, require(pathToConfig));

    var opts3 = {
      config: pathToConfig,
      watch: false
    };
    webpackService(opts3, function() {});
    assert.equal(cache._cache.length, 2);
    assert.instanceOf(cache._cache[1], Bundle);
    assert.strictEqual(cache._cache[1].opts, opts3);
    assert.strictEqual(cache._cache[1].config, require(pathToConfig));

    var opts4 = {
      config: pathToConfig + 'test',
      watch: false
    };
    webpackService(opts4, function() {});
    assert.equal(cache._cache.length, 3);
    assert.instanceOf(cache._cache[2], Bundle);
    assert.strictEqual(cache._cache[2].opts, opts4);
    assert.strictEqual(cache._cache[2].config, null);

    var opts5 = {
      config: pathToConfig + 'test',
      watch: false
    };
    webpackService(opts5, function() {});
    assert.equal(cache._cache.length, 3);

    var opts6 = {
      config: pathToConfig,
      watch: true
    };
    webpackService(opts6, function() {});
    assert.equal(cache._cache.length, 3);
  });
  it('can generate a bundle', function(done) {
    webpackService({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    }, function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

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
});