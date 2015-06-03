'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var webpack = require('webpack');
var Wrapper = require('../lib/Wrapper');
var Watcher = require('../lib/Watcher');
var Cache = require('../lib/Cache');
var utils = require('./utils');
var assert = utils.assert;

var TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  Wrapper._resetFileWatcher();
  utils.cleanTestOutputDir();
});
afterEach(function() {
  Wrapper._resetFileWatcher();
  utils.cleanTestOutputDir();
});

describe('Wrapper', function() {
  it('should be a function', function() {
    assert.isFunction(Wrapper);
  });
  it('should accept options and config arguments', function() {
    var opts = {};
    var config = {};
    var wrapper = new Wrapper(opts, config);
    assert.strictEqual(wrapper.opts, opts);
    assert.strictEqual(wrapper.config, config);
    assert.isFalse(wrapper.opts.watchConfig);
    assert.isFalse(wrapper.opts.watch);
    assert.isNumber(wrapper.opts.aggregateTimeout);
    assert.isUndefined(wrapper.opts.poll);
    assert.isNull(wrapper.opts.outputPath);
    assert.isNull(wrapper.opts.staticRoot);
    assert.isNull(wrapper.opts.staticUrl);
  });
  it('should accept a string as a config option and import the file specified', function(done) {
    var wrapper = new Wrapper({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    wrapper.getConfig(function(err, config) {
      assert.isNull(err);
      assert.strictEqual(config, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  it('should compile a basic bundle', function(done) {
    var wrapper = new Wrapper({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile(function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      var existsAt = stats.pathsToAssets['output.js'];
      assert.isString(existsAt);
      fs.readFile(existsAt, function(err, contents) {
        assert.isNull(err);
        var compiledWrapper = contents.toString();
        assert.include(compiledWrapper, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledWrapper, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  it('should expose the webpack config on the stats object', function(done) {
    var wrapper = new Wrapper({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile(function(err, stats) {
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

      var wrapper = new Wrapper();

      fs.writeFileSync(testFile, 'test 1');

      assert.isUndefined(Wrapper._watchedFiles[testFile]);
      var changeDetected = false;
      wrapper.watchFile(testFile, function() {
        changeDetected = true;
      });

      setTimeout(function() {
        assert.isArray(Wrapper._watchedFiles[testFile]);
        assert.equal(Wrapper._watchedFiles[testFile].length, 1);
        assert.isFalse(changeDetected);

        wrapper.watchFile(testFile, _.once(function() {
          assert.isTrue(changeDetected);
          done();
        }));

        fs.writeFileSync(testFile, 'test 2');

        assert.equal(Wrapper._watchedFiles[testFile].length, 2);
      }, utils.watcherWarmUpWait);
    });
  });
  describe('#getCompiler', function() {
    it('should not preserved the compiler', function(done) {
      var wrapper = new Wrapper({}, {});

      wrapper.getCompiler(function(err, compiler1) {
        assert.isNull(err);
        assert.isObject(compiler1);
        wrapper.getCompiler(function(err, compiler2) {
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
      var wrapper = new Wrapper({watch: true}, {});

      wrapper.getWatcher(function(err, watcher) {
        assert.isNull(err);
        assert.instanceOf(watcher, Watcher);
        done();
      });
    });
    it('should preserve the watcher', function(done) {
      var wrapper = new Wrapper({watch: true}, {});

      wrapper.getWatcher(function(err, watcher1) {
        assert.isNull(err);
        assert.isObject(watcher1);

        wrapper.getWatcher(function(err, watcher2) {
          assert.isNull(err);
          assert.isObject(watcher2);

          assert.strictEqual(watcher2, watcher1);
          done();
        });
      });
    });
  });
  describe('#processStats', function() {
    it('should produce a serializable form of the stats', function (done) {
      var wrapper = new Wrapper({
        watch: false,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.getCompiler(function(err, compiler) {
        assert.isNull(err);
        assert.isObject(compiler);

        compiler.run(function(err, stats) {
          assert.isNull(err);
          assert.isObject(stats);

          var processed = wrapper.processStats(stats);

          // webpack inserts regexes which can't be serialized
          processed.webpackConfig.module = null;

          var serialized = JSON.stringify(processed);
          assert.deepEqual(JSON.parse(serialized), processed);

          done();
        });
      });
    });
  });
  describe('#onceDone', function() {
    it('should not preserve errors and stats from the compilation, if not watching', function(done) {
      var wrapper = new Wrapper({
        watch: false,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone(function(err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.notStrictEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should preserve errors and stats from the compilation, if watching', function(done) {
      var wrapper = new Wrapper({
        watch: true,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone(function(err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.deepEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should rebuild wrappers when onceDone is called', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'output.js');

      var wrapper = new Wrapper({}, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_ONE__";');

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        wrapper.onceDone(function(err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          wrapper.onceDone(function(err, stats) {
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
      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'invalidate_config_watch_test', 'webpack.config.js')
      };

      var wrapper = new Wrapper(opts);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = {test:1};');

      wrapper.getConfig(function(err, config1) {
        assert.isNull(err);
        assert.isObject(config1);
        assert.strictEqual(wrapper.config, config1);
        assert.equal(config1.test, 1);

        wrapper.invalidateConfig();
        assert.isNull(wrapper.config);

        wrapper.getConfig(function(err, config2) {
          assert.isNull(err);
          assert.isObject(config2);
          assert.notStrictEqual(config2, config1);
          assert.strictEqual(wrapper.config, config2);
          done();
        });
      });
    });
    it('should cause any config changes to be reflected in the bundle', function(done) {
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

      var wrapper = new Wrapper(opts);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_1));

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var existsAt = stats.pathsToAssets['output.js'];
        assert.isString(existsAt);
        var contents = fs.readFileSync(existsAt);
        assert.include(contents.toString(), '__WATCHED_CONFIG_ONE__');

        wrapper.invalidateConfig();
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));

        wrapper.onceDone(function(err, stats) {
          var existsAt = stats.pathsToAssets['output.js'];
          assert.isString(existsAt);
          contents = fs.readFileSync(existsAt);
          assert.include(contents.toString(), '__WATCHED_CONFIG_TWO__');

          wrapper.invalidateConfig();
          fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));

          wrapper.onceDone(function(err, stats) {
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

      var wrapper = new Wrapper(opts);

      assert.isFalse(wrapper.watching);
      assert.isNull(wrapper.watcher);

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_1));

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isTrue(wrapper.watching);
        assert.isObject(wrapper.watcher);

        var existsAt = stats.pathsToAssets['output.js'];
        assert.isString(existsAt);
        var contents = fs.readFileSync(existsAt);
        assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_ONE__');

        wrapper.invalidateConfig();
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));

        assert.isFalse(wrapper.watching);
        assert.isNull(wrapper.watcher);

        wrapper.onceDone(function(err, stats) {
          assert.isTrue(wrapper.watching);
          assert.isObject(wrapper.watcher);

          var existsAt = stats.pathsToAssets['output.js'];
          assert.isString(existsAt);
          contents = fs.readFileSync(existsAt);
          assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_TWO__');

          wrapper.invalidateConfig();

          assert.isFalse(wrapper.watching);
          assert.isNull(wrapper.watcher);

          fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));

          wrapper.onceDone(function(err, stats) {
            assert.isTrue(wrapper.watching);
            assert.isObject(wrapper.watcher);

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
      var wrapper = new Wrapper();
      assert.isFalse(wrapper.opts.watchConfig);

      wrapper = new Wrapper({
        watchConfig: true
      });

      assert.isTrue(wrapper.opts.watchConfig);
    });
    it('should cause config files changes to trigger invalidateConfig', function(done) {
      this.timeout(utils.watcherTimeout);

      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'detect_changes_to_config_watch_test', 'webpack.config.js'),
        watchConfig: true
      };

      var wrapper = new Wrapper(opts);

      wrapper.invalidateConfig = function() {
        done();
      };

      mkdirp.sync(path.dirname(opts.config));
      fs.writeFileSync(opts.config, 'module.exports = {test:1}');

      assert.isUndefined(Wrapper._watchedFiles[opts.config]);

      wrapper.getConfig(function(err) {
        assert.isNull(err);
        assert.isArray(Wrapper._watchedFiles[opts.config]);
        assert.equal(Wrapper._watchedFiles[opts.config].length, 1);

        setTimeout(function() {
          fs.writeFileSync(opts.config, 'module.exports = {test:2}');
        }, utils.watcherWarmUpWait);
      });
    });
  });
  describe('#opts.aggregateTimeout', function() {
    it('should default to 200', function () {
      var wrapper = new Wrapper();
      assert.equal(wrapper.opts.aggregateTimeout, 200);

      wrapper = new Wrapper({
        aggregateTimeout: 300
      });

      assert.equal(wrapper.opts.aggregateTimeout, 300);
    });
    it('should be passed to the watcher', function(done) {
      var wrapper = new Wrapper({}, {});
      wrapper.getWatcher(function(err, watcher) {
        assert.isNull(err);
        assert.equal(watcher.opts.aggregateTimeout, 200);

        wrapper = new Wrapper({
          aggregateTimeout: 300
        }, {});

        wrapper.getWatcher(function(err, watcher) {
          assert.isNull(err);
          assert.equal(watcher.opts.aggregateTimeout, 300);
          done();
        });
      });
    });
  });
  describe('#opts.watch', function() {
    it('should default to false', function() {
      var wrapper = new Wrapper();
      assert.isFalse(wrapper.opts.watch);

      wrapper = new Wrapper({
        watch: true
      });

      assert.isTrue(wrapper.opts.watch);
    });
    it('should cause file changes to trigger bundle rebuilds', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      var wrapper = new Wrapper({
        watch: true,
        aggregateTimeout: utils.aggregateTimeout
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

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(function() {
            wrapper.onceDone(function(err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.property(stats.pathsToAssets, 'output.js');
              assert.equal(output, stats.pathsToAssets['output.js']);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(function() {
                wrapper.onceDone(function(err, stats) {
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

      var wrapper = new Wrapper({
        watch: true,
        aggregateTimeout: utils.aggregateTimeout
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

      wrapper.onceDone(function(err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);
        assert.equal(output, stats1.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, '+?');

          setTimeout(function() {
            wrapper.onceDone(function(err2, stats2) {
              assert.instanceOf(err2, Error);
              assert.isObject(stats2);

              wrapper.onceDone(function(err3, stats3) {
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

      var wrapper = new Wrapper({
        watch: true,
        aggregateTimeout: utils.aggregateTimeout
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

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, '+?');

          setTimeout(function() {
            wrapper.onceDone(function(err, stats) {
              assert.instanceOf(err, Error);
              assert.isObject(stats);

              fs.writeFileSync(entry, '__WATCHED_FILE_ERROR_TWO__');

              setTimeout(function() {
                wrapper.onceDone(function(err, stats) {
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
  describe('#opts.outputPath', function() {
    it('should default to null', function() {
      var wrapper = new Wrapper();
      assert.isNull(wrapper.opts.outputPath);

      wrapper = new Wrapper({
        outputPath: '/foo/bar'
      });

      assert.equal(wrapper.opts.outputPath, '/foo/bar');
    });
    it('should set a config\'s output.path prop', function(done) {
      var wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'output_path_bundle', 'webpack.config.js'),
        outputPath: '/some/path/'
      });

      wrapper.getConfig(function(err, config) {
        assert.isNull(err);
        assert.equal(config.context, 'context');
        assert.equal(config.entry, 'entry');
        assert.equal(config.output.path, '/some/path/');
        assert.equal(config.output.filename, 'test.js');
        done();
      });
    });
  });
  describe('#cache', function() {
    it('should be able to populate a cache', function(done) {
      var cache = new Cache(path.join(TEST_OUTPUT_DIR, 'bundle_test_cache.json'));
      assert.deepEqual(cache.data, {});

      var wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        cacheKey: 'test'
      }, null, cache);

      assert.strictEqual(wrapper.cache, cache);
      assert.isString(wrapper.opts.config);

      wrapper.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.equal(Object.keys(cache.data).length, 1);
        assert.property(cache.data, 'test');
        assert.isObject(cache.data.test);

        cache.get('test', function(err, entry) {
          assert.isNull(err);
          assert.isObject(entry);

          assert.isNumber(entry.startTime);
          assert.isArray(entry.fileDependencies);
          assert.isObject(entry.stats);
          assert.equal(entry.config, wrapper.opts.config);

          done();
        });
      });
    });
  });
  describe('#stats.urlsToAssets', function() {
    it('should create urls relative to staticRoot', function(done) {
      var wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

        done();
      });
    });
    it('should handle staticUrl without a trailing slash', function(done) {
      var wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static'
      });

      wrapper.compile(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

        done();
      });
    });
  });
  describe('#stats.rendered', function() {
    it('should create rendered elements using staticRoot and staticUrl', function(done) {
      var wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.isObject(stats.rendered);
        assert.isArray(stats.rendered.styleSheets);
        assert.isArray(stats.rendered.scripts);
        assert.equal(stats.rendered.scripts.length, 1);
        assert.equal(stats.rendered.scripts[0], '<script src="/static/url/test/output.js"></script>');

        done();
      });
    });
  });
  describe('#opts.build', function() {
    it('should call the function matched on the config object', function(done) {
      var wrapper = new Wrapper({
        config: {
          builds: {
            foo: function() {
              done();
            }
          }
        },
        build: 'foo'
      });

      wrapper.getConfig(function(){});
    });
    it('should provide the config and opts objects', function(done) {
      var opts = {
        build: 'foo'
      };

      var config = {
        builds: {
          foo: function(_config, _opts) {
            assert.strictEqual(_config, config);
            assert.strictEqual(_opts, opts);
            done();
          }
        }
      };

      opts.config = config;

      var wrapper = new Wrapper(opts);

      wrapper.getConfig(function(){});
    });
  });
  describe('#opts.hmr', function() {
    it('should apply the hmr build', function(done) {
      var publicPath = '/static/foo';

      var wrapper = new Wrapper({
        config: {},
        hmr: true,
        hmrRoot: 'http://test.com',
        outputPath: '/foo/bar',
        publicPath: publicPath
      });

      wrapper.getConfig(function(err, config){
        assert.isNull(err);

        assert.isArray(config.plugins);
        assert.isObject(config.output);
        assert.isArray(config.entry);

        assert.equal(config.plugins.length, 3);

        assert.equal(config.entry[1], 'webpack/hot/only-dev-server');

        assert.equal(config.output.publicPath, publicPath + '/');

        assert.equal(config.recordsPath, '/foo/bar/webpack.records-' + wrapper.opts.hash + '.json');

        done();
      });
    });
  });
});