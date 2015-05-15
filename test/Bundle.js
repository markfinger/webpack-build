'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var Bundle = require('../lib/Bundle');
var Watcher = require('../lib/Watcher');
var utils = require('./utils');
var assert = utils.assert;

var TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

var NOOP = function(){};
var SILENT_LOGGER = {
  log: NOOP,
  info: NOOP,
  warn: NOOP,
  error: NOOP
};

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  Bundle._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('Bundle', function() {
  it('should be a function', function() {
    assert.isFunction(Bundle);
  });
  it('should accept options and config arguments', function() {
    var opts = {};
    var config = {};
    var bundle = new Bundle(opts, config);
    assert.strictEqual(bundle.opts, opts);
    assert.strictEqual(bundle.config, config);
    assert.isFalse(bundle.opts.watchConfig);
    assert.isFalse(bundle.opts.watch);
    assert.isNull(bundle.opts.bundleDir);
  });
  it('should accept a string as a config option and import the file specified', function(done) {
    var bundle = new Bundle({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    bundle.getConfig(function(err, config) {
      assert.isNull(err);
      assert.strictEqual(config, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  it('should compile a basic bundle', function(done) {
    var bundle = new Bundle({}, require('./test_bundles/basic_bundle/webpack.config'));

    bundle.compile(function(err, stats) {
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
  it('should expose the webpack config on the stats object', function(done) {
    var bundle = new Bundle({}, require('./test_bundles/basic_bundle/webpack.config'));

    bundle.compile(function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);
      assert.strictEqual(stats.webpackConfig, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  describe('#watchFile', function() {
    it('should be able to detect changes to a particular file', function(done) {
      this.timeout(utils.watcherTimeout);

      var testFile = path.join(TEST_OUTPUT_DIR, 'watch_test', 'test.js');

      mkdirp.sync(path.dirname(testFile));

      var bundle = new Bundle();

      fs.writeFileSync(testFile, 'test 1');

      assert.isUndefined(Bundle._watchedFiles[testFile]);
      var changeDetected = false;
      bundle.watchFile(testFile, function() {
        changeDetected = true;
      });

      setTimeout(function() {
        assert.isArray(Bundle._watchedFiles[testFile]);
        assert.equal(Bundle._watchedFiles[testFile].length, 1);
        assert.isFalse(changeDetected);

        bundle.watchFile(testFile, _.once(function() {
          assert.isTrue(changeDetected);
          done();
        }));

        fs.writeFileSync(testFile, 'test 2');

        assert.equal(Bundle._watchedFiles[testFile].length, 2);
      }, utils.watcherWarmUpWait);
    });
  });
  describe('#getCompiler', function() {
    it('should not preserved the compiler', function(done) {
      var bundle = new Bundle({}, {});

      bundle.getCompiler(function(err, compiler1) {
        assert.isNull(err);
        assert.isObject(compiler1);
        bundle.getCompiler(function(err, compiler2) {
          assert.isNull(err);
          assert.isObject(compiler2);
          assert.notStrictEqual(compiler1, compiler2);
          done();
        });
      });
    });
  });
  describe('#getWatcher', function() {
    it('should provide an instance of Watcher', function(done) {
      var bundle = new Bundle({watch: true}, {});

      bundle.getWatcher(function(err, watcher) {
        assert.isNull(err);
        assert.instanceOf(watcher, Watcher);
        done();
      });
    });
    it('should preserve the watcher', function(done) {
      var bundle = new Bundle({watch: true}, {});

      bundle.getWatcher(function(err, watcher1) {
        assert.isNull(err);
        assert.isObject(watcher1);

        bundle.getWatcher(function(err, watcher2) {
          assert.isNull(err);
          assert.isObject(watcher2);

          assert.strictEqual(watcher2, watcher1);
          done();
        });
      });
    });
  });
  describe('#onceDone', function() {
    it('should not preserve errors and stats from the compilation, if not watching', function(done) {
      var bundle = new Bundle({
        watch: false,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      bundle.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        bundle.onceDone(function(err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.notStrictEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should preserve errors and stats from the compilation, if watching', function(done) {
      var bundle = new Bundle({
        watch: true,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      bundle.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        bundle.onceDone(function(err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.strictEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should rebuild bundles when onceDone is called', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'output.js');

      var bundle = new Bundle({}, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_ONE__";');

      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        bundle.onceDone(function(err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          bundle.onceDone(function(err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.pathsToAssets['output.js']);
            contents = fs.readFileSync(output);
            assert.include(contents.toString(), '__REBUILT_TEST_THREE__');
            done();
          });
        });
      });
    });
  });
  describe('#invalidateConfig', function() {
    it('should reset the bundle\'s config', function(done) {
      this.timeout(utils.watcherTimeout);

      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'invalidate_config_watch_test', 'webpack.config.js')
      };

      var bundle = new Bundle(opts);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = {test:1};');

      bundle.getConfig(function(err, config1) {
        assert.isNull(err);
        assert.isObject(config1);
        assert.strictEqual(bundle.config, config1);
        assert.equal(config1.test, 1);

        bundle.invalidateConfig();
        assert.isNull(bundle.config);

        bundle.getConfig(function(err, config2) {
          assert.isNull(err);
          assert.isObject(config2);
          assert.notStrictEqual(config2, config1);
          assert.strictEqual(bundle.config, config2);
          done();
        });
      });
    });
    it('should cause any config changes to be reflected in the bundle', function(done) {
      this.timeout(utils.watcherTimeout);

      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'watch_config_to_invalidate_bundle', 'webpack.config.js')
      };

      var config_1 = {
        context: path.join(__dirname, 'test_bundles', 'watched_config_bundle'),
        entry: './entry_1.js',
        output: {
          path: path.join(TEST_OUTPUT_DIR, 'watched_config'),
          filename: 'output.js'
        }
      };

      var config_2 = _.defaults({
        entry: './entry_2.js'
      }, config_1);

      var config_3 = _.defaults({
        entry: './entry_3.js'
      }, config_2);

      var bundle = new Bundle(opts);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_1));

      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var existsAt = stats.pathsToAssets['output.js'];
        assert.isString(existsAt);
        var contents = fs.readFileSync(existsAt);
        assert.include(contents.toString(), '__WATCHED_CONFIG_ONE__');

        bundle.invalidateConfig();
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));

        bundle.onceDone(function(err, stats) {
          var existsAt = stats.pathsToAssets['output.js'];
          assert.isString(existsAt);
          contents = fs.readFileSync(existsAt);
          assert.include(contents.toString(), '__WATCHED_CONFIG_TWO__');

          bundle.invalidateConfig();
          fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));

          bundle.onceDone(function(err, stats) {
            var existsAt = stats.pathsToAssets['output.js'];
            assert.isString(existsAt);
            contents = fs.readFileSync(existsAt);
            assert.include(contents.toString(), '__WATCHED_CONFIG_THREE__');
            done();
          });
        });
      });
    });
    it('should cause config file changes to invalidate the watcher', function(done) {
      this.timeout(utils.watcherTimeout);

      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'watched_source_and_config_bundle', 'webpack.config.js'),
        watch: true
      };

      var config_1 = {
        context: path.join(__dirname, 'test_bundles', 'watched_source_and_config_bundle'),
        entry: './entry_1.js',
        output: {
          path: path.join(TEST_OUTPUT_DIR, 'watched_source_and_config'),
          filename: 'output.js'
        }
      };

      var config_2 = _.defaults({
        entry: './entry_2.js'
      }, config_1);

      var config_3 = _.defaults({
        entry: './entry_3.js'
      }, config_2);

      var bundle = new Bundle(opts);

      assert.isFalse(bundle.watching);
      assert.isNull(bundle.watcher);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_1));

      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isTrue(bundle.watching);
        assert.isObject(bundle.watcher);

        var existsAt = stats.pathsToAssets['output.js'];
        assert.isString(existsAt);
        var contents = fs.readFileSync(existsAt);
        assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_ONE__');

        bundle.invalidateConfig();
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));

        assert.isFalse(bundle.watching);
        assert.isNull(bundle.watcher);

        bundle.onceDone(function(err, stats) {
          assert.isTrue(bundle.watching);
          assert.isObject(bundle.watcher);

          var existsAt = stats.pathsToAssets['output.js'];
          assert.isString(existsAt);
          contents = fs.readFileSync(existsAt);
          assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_TWO__');

          bundle.invalidateConfig();

          assert.isFalse(bundle.watching);
          assert.isNull(bundle.watcher);

          fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));

          bundle.onceDone(function(err, stats) {
            assert.isTrue(bundle.watching);
            assert.isObject(bundle.watcher);

            var existsAt = stats.pathsToAssets['output.js'];
            assert.isString(existsAt);
            contents = fs.readFileSync(existsAt);
            assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_THREE__');

            done();
          });
        });
      });
    });
  });
  describe('#opts.watchConfig', function() {
    it('should default to false', function() {
      var bundle = new Bundle();
      assert.isFalse(bundle.opts.watchConfig);

      bundle = new Bundle({
        watchConfig: true
      });

      assert.isTrue(bundle.opts.watchConfig);
    });
    it('should cause config files changes to trigger invalidateConfig', function(done) {
      this.timeout(utils.watcherTimeout);

      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'detect_changes_to_config_watch_test', 'webpack.config.js'),
        watchConfig: true
      };

      var bundle = new Bundle(opts);

      bundle.invalidateConfig = function() {
        done();
      };

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = {test:1}');

      assert.isUndefined(Bundle._watchedFiles[opts.config]);

      bundle.getConfig(function(err) {
        assert.isNull(err);
        assert.isArray(Bundle._watchedFiles[opts.config]);
        assert.equal(Bundle._watchedFiles[opts.config].length, 1);
        fs.writeFileSync(opts.config, 'module.exports = {test:2}');
      });
    });
  });
  describe('#opts.watchDelay', function() {
    it('should default to 200', function () {
      var bundle = new Bundle();
      assert.equal(bundle.opts.watchDelay, 200);

      bundle = new Bundle({
        watchDelay: 300
      });

      assert.equal(bundle.opts.watchDelay, 300);
    });
    it('should be passed to the watcher', function(done) {
      var bundle = new Bundle({}, {});
      bundle.getWatcher(function(err, watcher) {
        assert.isNull(err);
        assert.equal(watcher.opts.watchDelay, 200);

        bundle = new Bundle({
          watchDelay: 300
        }, {});

        bundle.getWatcher(function(err, watcher) {
          assert.isNull(err);
          assert.equal(watcher.opts.watchDelay, 300);
          done();
        });
      });
    });
  });
  describe('#opts.watch', function() {
    it('should default to false', function() {
      var bundle = new Bundle();
      assert.isFalse(bundle.opts.watch);

      bundle = new Bundle({
        watch: true
      });

      assert.isTrue(bundle.opts.watch);
    });
    it('should cause file changes to trigger bundle rebuilds', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      var bundle = new Bundle({
        watch: true,
        watchDelay: utils.watchDelay
      }, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_ONE__";');

      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(function() {
            bundle.onceDone(function(err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.property(stats.pathsToAssets, 'output.js');
              assert.equal(output, stats.pathsToAssets['output.js']);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(function() {
                bundle.onceDone(function(err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.pathsToAssets['output.js']);
                  contents = fs.readFileSync(output);
                  assert.include(contents.toString(), '__WATCH_TEST_THREE__');
                  done();
                });
              }, utils.watcherWait);
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
    it('should indicate any errors which occurred during background compilation', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'watched_file_error', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watched_file_error', 'output.js');

      var bundle = new Bundle({
        watch: true,
        watchDelay: utils.watchDelay,
        logger: SILENT_LOGGER
      }, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__WATCHED_FILE_ERROR_ONE__";');

      bundle.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);
        assert.equal(output, stats1.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, '+?');

          setTimeout(function() {
            bundle.onceDone(function(err2, stats2) {
              assert.instanceOf(err2, Error);
              assert.isObject(stats2);

              bundle.onceDone(function(err3, stats3) {
                assert.instanceOf(err3, Error);
                assert.isObject(stats3);
                assert.strictEqual(err3, err2);
                assert.strictEqual(stats3, stats2);

                done();
              });
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
    it('should continue to compile if a file change introduces an error', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'output.js');

      var bundle = new Bundle({
        watch: true,
        watchDelay: utils.watchDelay,
        logger: SILENT_LOGGER
      }, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__WATCHED_FILE_ERROR_ONE__";');

      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, '+?');

          setTimeout(function() {
            bundle.onceDone(function(err, stats) {
              assert.instanceOf(err, Error);
              assert.isObject(stats);

              fs.writeFileSync(entry, '__WATCHED_FILE_ERROR_TWO__');

              setTimeout(function() {
                bundle.onceDone(function(err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.pathsToAssets['output.js']);
                  var contents = fs.readFileSync(output);
                  assert.include(contents.toString(), '__WATCHED_FILE_ERROR_TWO__');
                  done();
                });
              }, utils.watcherWait);
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
  });
  describe('#opts.bundleDir', function() {
    it('should default to null', function() {
      var bundle = new Bundle();
      assert.isNull(bundle.opts.bundleDir);

      bundle = new Bundle({
        bundleDir: '/foo/bar'
      });

      assert.equal(bundle.opts.bundleDir, '/foo/bar');
    });
    it('should replace [bundle_dir] tokens in a config\'s output path', function(done) {
      var bundle = new Bundle({
        config: path.join(__dirname, 'test_bundles', 'bundle_dir_bundle', 'webpack.config.js'),
        bundleDir: '/some/path/'
      });

      bundle.getConfig(function(err, config) {
        assert.isNull(err);
        assert.equal(config.context, 'context');
        assert.equal(config.entry, 'entry');
        assert.equal(config.output.path, '/some/path/bar');
        assert.equal(config.output.filename, 'test.js');
        done();
      });
    });
  });
});