'use strict';

var path = require('path');
var fs = require('fs');
var webpackWrapper = require('..');
var Bundle = require('../lib/Bundle');
var utils = require('./utils');

var assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  webpackWrapper._bundles.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  webpackWrapper._bundles.clear();
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('webpack-wrapper', function() {
  it('is a function', function() {
    assert.isFunction(webpackWrapper);
  });
  it('can accept options and callback arguments', function() {
    var opts = {
      config: require('./test_bundles/basic_bundle/webpack.config')
    };
    webpackWrapper(opts, function() {});
  });
  it('populates the bundle list', function() {
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
  it('can generate a bundle', function(done) {
    webpackWrapper({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    }, function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      assert.isObject(stats.pathsToAssets);
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
  it('can pass the `this.host.logger` prop to bundles', function() {
    var logger = {};

    var bundle = webpackWrapper.call(
      {host: {logger: logger}},
      {},
      function(){}
    );

    assert.strictEqual(bundle.opts.logger, logger);
  });
});