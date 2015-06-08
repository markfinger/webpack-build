'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _libWrapper = require('../../lib/Wrapper');

var _libWrapper2 = _interopRequireDefault(_libWrapper);

var _libWatcher = require('../../lib/Watcher');

var _libWatcher2 = _interopRequireDefault(_libWatcher);

var _libOptions = require('../../lib/options');

var _libOptions2 = _interopRequireDefault(_libOptions);

var _libCache = require('../../lib/Cache');

var _libCache2 = _interopRequireDefault(_libCache);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var assert = _utils2['default'].assert;
var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _utils2['default'].cleanTestOutputDir();
});

describe('Wrapper', function () {
  it('should be a function', function () {
    assert.isFunction(_libWrapper2['default']);
  });
  it('should accept options and config arguments', function () {
    var opts = {};
    var config = {};
    var wrapper = new _libWrapper2['default'](opts, config);
    assert.strictEqual(wrapper.opts, opts);
    assert.strictEqual(wrapper.config, config);
    assert.isTrue(wrapper.opts.watch);
    assert.isNumber(wrapper.opts.aggregateTimeout);
    assert.isUndefined(wrapper.opts.poll);
    assert.equal(wrapper.opts.outputPath, '');
    assert.equal(wrapper.opts.staticRoot, '');
    assert.equal(wrapper.opts.staticUrl, '');
  });
  it('should accept a string as a config option and import the file specified', function (done) {
    var wrapper = new _libWrapper2['default']({
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    wrapper.getConfig(function (err, config) {
      assert.isNull(err);
      assert.strictEqual(config, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  it('should compile a basic bundle', function (done) {
    var wrapper = new _libWrapper2['default']({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile(function (err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      var existsAt = stats.pathsToAssets['output.js'];
      assert.isString(existsAt);
      _fs2['default'].readFile(existsAt, function (err, contents) {
        assert.isNull(err);
        var compiledWrapper = contents.toString();
        assert.include(compiledWrapper, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledWrapper, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  it('should expose the webpack config on the stats object', function (done) {
    var wrapper = new _libWrapper2['default']({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile(function (err, stats) {
      assert.isNull(err);
      assert.isObject(stats);
      assert.strictEqual(stats.webpackConfig, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  describe('#getCompiler', function () {
    it('should not preserved the compiler', function (done) {
      var wrapper = new _libWrapper2['default']({}, {});

      wrapper.getCompiler(function (err, compiler1) {
        assert.isNull(err);
        assert.isObject(compiler1);
        wrapper.getCompiler(function (err, compiler2) {
          assert.isNull(err);
          assert.isObject(compiler2);
          assert.notStrictEqual(compiler1, compiler2);
          done();
        });
      });
    });
  });
  describe('#getWatcher', function () {
    it('should provide an instance of Watcher', function (done) {
      var wrapper = new _libWrapper2['default']({ watch: true }, {});

      wrapper.getWatcher(function (err, watcher) {
        assert.isNull(err);
        assert.instanceOf(watcher, _libWatcher2['default']);
        done();
      });
    });
    it('should preserve the watcher', function (done) {
      var wrapper = new _libWrapper2['default']({ watch: true }, {});

      wrapper.getWatcher(function (err, watcher1) {
        assert.isNull(err);
        assert.isObject(watcher1);

        wrapper.getWatcher(function (err, watcher2) {
          assert.isNull(err);
          assert.isObject(watcher2);

          assert.strictEqual(watcher2, watcher1);
          done();
        });
      });
    });
  });
  describe('#processStats', function () {
    it('should produce a serializable form of the stats', function (done) {
      var wrapper = new _libWrapper2['default']({
        watch: false,
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.getCompiler(function (err, compiler) {
        assert.isNull(err);
        assert.isObject(compiler);

        compiler.run(function (err, stats) {
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
  describe('#onceDone', function () {
    it('should not preserve errors and stats from the compilation, if not watching', function (done) {
      var wrapper = new _libWrapper2['default']({
        watch: false,
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone(function (err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone(function (err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.notStrictEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should preserve errors and stats from the compilation, if watching', function (done) {
      var wrapper = new _libWrapper2['default']({
        watch: true,
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone(function (err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone(function (err2, stats2) {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.deepEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should rebuild wrappers when onceDone is called', function (done) {
      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'output.js');

      var wrapper = new _libWrapper2['default']({
        watch: false
      }, {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__REBUILT_TEST_ONE__";');

      wrapper.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        _fs2['default'].writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        wrapper.onceDone(function (err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = _fs2['default'].readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          _fs2['default'].writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          wrapper.onceDone(function (err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.pathsToAssets['output.js']);
            contents = _fs2['default'].readFileSync(output);
            assert.include(contents.toString(), '__REBUILT_TEST_THREE__');
            done();
          });
        });
      });
    });
  });
  describe('#opts.aggregateTimeout', function () {
    it('should default to 200', function () {
      var wrapper = new _libWrapper2['default']();
      assert.equal(wrapper.opts.aggregateTimeout, 200);

      wrapper = new _libWrapper2['default']({
        aggregateTimeout: 300
      });

      assert.equal(wrapper.opts.aggregateTimeout, 300);
    });
    it('should be passed to the watcher', function (done) {
      var wrapper = new _libWrapper2['default']({}, {});
      wrapper.getWatcher(function (err, watcher) {
        assert.isNull(err);
        assert.equal(watcher.opts.aggregateTimeout, 200);

        wrapper = new _libWrapper2['default']({
          aggregateTimeout: 300
        }, {});

        wrapper.getWatcher(function (err, watcher) {
          assert.isNull(err);
          assert.equal(watcher.opts.aggregateTimeout, 300);
          done();
        });
      });
    });
  });
  describe('#opts.watch', function () {
    it('should default to true', function () {
      var wrapper = new _libWrapper2['default']();
      assert.isTrue(wrapper.opts.watch);

      wrapper = new _libWrapper2['default']({
        watch: false
      });

      assert.isFalse(wrapper.opts.watch);
    });
    it('should cause file changes to trigger bundle rebuilds', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      var wrapper = new _libWrapper2['default']({
        watch: true,
        aggregateTimeout: _utils2['default'].aggregateTimeout
      }, {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_ONE__";');

      wrapper.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(function () {
            wrapper.onceDone(function (err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.property(stats.pathsToAssets, 'output.js');
              assert.equal(output, stats.pathsToAssets['output.js']);
              contents = _fs2['default'].readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(function () {
                wrapper.onceDone(function (err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.pathsToAssets['output.js']);
                  contents = _fs2['default'].readFileSync(output);
                  assert.include(contents.toString(), '__WATCH_TEST_THREE__');
                  done();
                });
              }, _utils2['default'].watcherWait);
            });
          }, _utils2['default'].watcherWait);
        }, _utils2['default'].watcherWarmUpWait);
      });
    });
    it('should indicate any errors which occurred during background compilation', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'watched_file_error', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'watched_file_error', 'output.js');

      var wrapper = new _libWrapper2['default']({
        watch: true,
        aggregateTimeout: _utils2['default'].aggregateTimeout
      }, {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCHED_FILE_ERROR_ONE__";');

      wrapper.onceDone(function (err1, stats1) {
        assert.isNull(err1);
        assert.isObject(stats1);
        assert.equal(output, stats1.pathsToAssets['output.js']);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, '+?');

          setTimeout(function () {
            wrapper.onceDone(function (err2, stats2) {
              assert.instanceOf(err2, Error);
              assert.isObject(stats2);

              wrapper.onceDone(function (err3, stats3) {
                assert.instanceOf(err3, Error);
                assert.isObject(stats3);
                assert.strictEqual(err3, err2);
                assert.strictEqual(stats3, stats2);

                done();
              });
            });
          }, _utils2['default'].watcherWait);
        }, _utils2['default'].watcherWarmUpWait);
      });
    });
    it('should continue to compile if a file change introduces an error', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'output.js');

      var wrapper = new _libWrapper2['default']({
        watch: true,
        aggregateTimeout: _utils2['default'].aggregateTimeout
      }, {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCHED_FILE_ERROR_ONE__";');

      wrapper.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, '+?');

          setTimeout(function () {
            wrapper.onceDone(function (err, stats) {
              assert.instanceOf(err, Error);
              assert.isObject(stats);

              _fs2['default'].writeFileSync(entry, '__WATCHED_FILE_ERROR_TWO__');

              setTimeout(function () {
                wrapper.onceDone(function (err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.pathsToAssets['output.js']);
                  var contents = _fs2['default'].readFileSync(output);
                  assert.include(contents.toString(), '__WATCHED_FILE_ERROR_TWO__');
                  done();
                });
              }, _utils2['default'].watcherWait);
            });
          }, _utils2['default'].watcherWait);
        }, _utils2['default'].watcherWarmUpWait);
      });
    });
  });
  describe('#opts.outputPath', function () {
    it('should default to an empty string', function () {
      var wrapper = new _libWrapper2['default']();
      assert.equal(wrapper.opts.outputPath, '');

      wrapper = new _libWrapper2['default']({
        outputPath: '/foo/bar'
      });

      assert.equal(wrapper.opts.outputPath, '/foo/bar');
    });
    it('should set a config\'s output.path prop', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'output_path_bundle', 'webpack.config.js'),
        outputPath: '/some/path/'
      });

      wrapper.getConfig(function (err, config) {
        assert.isNull(err);
        assert.equal(config.context, 'context');
        assert.equal(config.entry, 'entry');
        assert.equal(config.output.path, '/some/path/');
        assert.equal(config.output.filename, 'test.js');
        done();
      });
    });
  });
  describe('#cache', function () {
    it('should be able to populate a cache', function (done) {
      var cache = new _libCache2['default']((0, _libOptions2['default'])({ cacheFile: _path2['default'].join(TEST_OUTPUT_DIR, 'bundle_test_cache.json') }));
      assert.deepEqual(cache.data, {});

      var wrapper = new _libWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      }, null, cache);

      assert.strictEqual(wrapper.cache, cache);
      assert.isString(wrapper.opts.config);

      wrapper.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        cache.get(function (err, entry) {
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
  describe('#stats.urlsToAssets', function () {
    it('should create urls relative to staticRoot', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: _path2['default'].join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

        done();
      });
    });
    it('should handle staticUrl without a trailing slash', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: _path2['default'].join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static'
      });

      wrapper.compile(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

        done();
      });
    });
  });
  describe('#stats.rendered', function () {
    it('should create rendered elements using staticRoot and staticUrl', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: _path2['default'].join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urlsToAssets);
        assert.isObject(stats.rendered);
        assert.isArray(stats.rendered.link);
        assert.isArray(stats.rendered.script);
        assert.equal(stats.rendered.script.length, 1);
        assert.equal(stats.rendered.script[0], '<script src="/static/url/test/output.js"></script>');

        done();
      });
    });
  });
  describe('#opts.env', function () {
    it('should call the function matched on the config object', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: {
          env: {
            foo: function foo() {
              done();
            }
          }
        },
        env: 'foo'
      });

      wrapper.getConfig(function () {});
    });
    it('should provide the config and opts objects', function (done) {
      var opts = {
        env: 'foo'
      };

      var config = {
        env: {
          foo: function foo(_config, _opts) {
            assert.strictEqual(_config, config);
            assert.strictEqual(_opts, opts);
            done();
          }
        }
      };

      opts.config = config;

      var wrapper = new _libWrapper2['default'](opts);

      wrapper.getConfig(function () {});
    });
    it('should accept mutations to the config object', function (done) {
      var wrapper = new _libWrapper2['default']({
        config: {
          env: {
            foo: function foo(config) {
              config.devtool = 'eval';
            }
          }
        },
        env: 'foo'
      });

      wrapper.getConfig(function (err, config) {
        assert.isNull(err);
        assert.isObject(config);

        assert.equal(config.devtool, 'eval');
        done();
      });
    });
  });
  describe('#opts.hmr', function () {
    it('should add hmr settings and entries', function (done) {
      var publicPath = '/static/foo';

      var wrapper = new _libWrapper2['default']({
        config: {},
        hmr: true,
        hmrRoot: 'http://test.com',
        outputPath: '/foo/bar',
        publicPath: publicPath
      });

      wrapper.getConfig(function (err, config) {
        assert.isNull(err);

        assert.isArray(config.plugins);
        assert.isObject(config.output);
        assert.isArray(config.entry);

        assert.include(config.entry[0], 'webpack-build/lib/hmr/client?{"');
        assert.equal(config.entry[1], 'webpack/hot/only-dev-server');

        assert.equal(config.output.publicPath, publicPath + '/');

        assert.equal(config.recordsPath, '/foo/bar/webpack.records-' + wrapper.opts.hash + '.json');

        done();
      });
    });
  });
});
//# sourceMappingURL=Wrapper.js.map