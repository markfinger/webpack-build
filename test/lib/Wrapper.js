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

var _libWrappersWrapper = require('../../lib/wrappers/Wrapper');

var _libWrappersWrapper2 = _interopRequireDefault(_libWrappersWrapper);

var _libWrappersWatcher = require('../../lib/wrappers/Watcher');

var _libWrappersWatcher2 = _interopRequireDefault(_libWrappersWatcher);

var _libOptions = require('../../lib/options');

var _libOptions2 = _interopRequireDefault(_libOptions);

var _libCaches = require('../../lib/caches');

var _libCaches2 = _interopRequireDefault(_libCaches);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _test_bundlesBasic_bundleWebpackConfig = require('./test_bundles/basic_bundle/webpack.config');

var _test_bundlesBasic_bundleWebpackConfig2 = _interopRequireDefault(_test_bundlesBasic_bundleWebpackConfig);

var _test_bundlesLibrary_bundleWebpackConfig = require('./test_bundles/library_bundle/webpack.config');

var _test_bundlesLibrary_bundleWebpackConfig2 = _interopRequireDefault(_test_bundlesLibrary_bundleWebpackConfig);

var assert = _utils2['default'].assert;
var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _utils2['default'].cleanTestOutputDir();
  _libCaches2['default'].clear();
});
afterEach(function () {
  _utils2['default'].cleanTestOutputDir();
  _libCaches2['default'].clear();
});

describe('Wrapper', function () {
  it('should be a function', function () {
    assert.isFunction(_libWrappersWrapper2['default']);
  });
  it('should accept options and config arguments', function () {
    var opts = {};
    var config = {};
    var wrapper = new _libWrappersWrapper2['default'](opts, config);
    assert.strictEqual(wrapper.opts, opts);
    assert.strictEqual(wrapper.config, config);
    assert.isFalse(wrapper.opts.watch);
    assert.isNumber(wrapper.opts.aggregateTimeout);
    assert.isUndefined(wrapper.opts.poll);
    assert.equal(wrapper.opts.outputPath, '');
    assert.equal(wrapper.opts.staticRoot, '');
    assert.equal(wrapper.opts.staticUrl, '');
  });
  it('should accept a string as a config option and import the file specified', function (done) {
    var wrapper = new _libWrappersWrapper2['default']({
      config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    wrapper.getConfig(function (err, config) {
      assert.isNull(err);
      assert.deepEqual(config, (0, _test_bundlesBasic_bundleWebpackConfig2['default'])());
      done();
    });
  });
  it('should compile a basic bundle', function (done) {
    var wrapper = new _libWrappersWrapper2['default']({}, (0, _test_bundlesBasic_bundleWebpackConfig2['default'])());

    wrapper.compile(function (err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      var existsAt = stats.assets[0];
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
  it('should compile a bundle with multiple chunks', function (done) {
    var wrapper = new _libWrappersWrapper2['default']({
      config: _path2['default'].join(__dirname, 'test_bundles', 'multiple_chunks', 'webpack.config.js')
    });

    wrapper.compile(function (err, data) {
      assert.isNull(err);
      assert.isObject(data);

      assert.isObject(data.output.one);
      assert.isObject(data.output.two);
      assert.isObject(data.output.three);

      assert.isString(data.output.one.js[0]);
      assert.isString(data.output.two.js[0]);
      assert.isString(data.output.three.js[0]);

      var contents = _fs2['default'].readFileSync(data.output.one.js[0]).toString();
      assert.include(contents, '__ONE__');

      contents = _fs2['default'].readFileSync(data.output.two.js[0]).toString();
      assert.include(contents, '__TWO__');

      contents = _fs2['default'].readFileSync(data.output.three.js[0]).toString();
      assert.include(contents, '__THREE__');
      done();
    });
  });
  it('should expose the output options object', function (done) {
    var wrapper = new _libWrappersWrapper2['default']({}, (0, _test_bundlesLibrary_bundleWebpackConfig2['default'])());

    wrapper.compile(function (err, data) {
      assert.isNull(err);
      assert.isObject(data.outputOptions);
      assert.equal(data.outputOptions.library, 'foo');
      assert.equal(data.outputOptions.libraryTarget, 'var');
      done();
    });
  });
  describe('#getCompiler', function () {
    it('should not preserved the compiler', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({}, {});

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
      var wrapper = new _libWrappersWrapper2['default']({ watch: true }, {});

      wrapper.getWatcher(function (err, watcher) {
        assert.isNull(err);
        assert.instanceOf(watcher, _libWrappersWatcher2['default']);
        done();
      });
    });
    it('should preserve the watcher', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({ watch: true }, {});

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
  describe('#generateOutput', function () {
    it('should produce a serializable form of the compilation\'s output', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({
        watch: false,
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone(function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        // deepEqual checks hasOwnProperty
        delete data.buildOptions.poll;

        var serialized = JSON.stringify(data);
        assert.deepEqual(JSON.parse(serialized), data);

        done();
      });
    });
  });
  describe('#onceDone', function () {
    it('should not preserve errors and stats from the compilation, if not watching', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({
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
      var wrapper = new _libWrappersWrapper2['default']({
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

      var wrapper = new _libWrappersWrapper2['default']({
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
        assert.equal(output, stats.assets[0]);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        _fs2['default'].writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        wrapper.onceDone(function (err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.assets[0]);
          contents = _fs2['default'].readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          _fs2['default'].writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          wrapper.onceDone(function (err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.assets[0]);
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
      var wrapper = new _libWrappersWrapper2['default']();
      assert.equal(wrapper.opts.aggregateTimeout, 200);

      wrapper = new _libWrappersWrapper2['default']({
        aggregateTimeout: 300
      });

      assert.equal(wrapper.opts.aggregateTimeout, 300);
    });
    it('should be passed to the watcher', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({}, {});
      wrapper.getWatcher(function (err, watcher) {
        assert.isNull(err);
        assert.equal(watcher.opts.aggregateTimeout, 200);

        wrapper = new _libWrappersWrapper2['default']({
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
    it('should default to false', function () {
      var wrapper = new _libWrappersWrapper2['default']();
      assert.isFalse(wrapper.opts.watch);

      wrapper = new _libWrappersWrapper2['default']({
        watch: true
      });

      assert.isTrue(wrapper.opts.watch);
    });
    it('should cause file changes to trigger bundle rebuilds', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      var wrapper = new _libWrappersWrapper2['default']({
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
        assert.equal(output, stats.assets[0]);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(function () {
            wrapper.onceDone(function (err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.assets[0]);
              contents = _fs2['default'].readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(function () {
                wrapper.onceDone(function (err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.assets[0]);
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

      var wrapper = new _libWrappersWrapper2['default']({
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
        assert.equal(output, stats1.assets[0]);
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
                assert.deepEqual(stats3, stats2);

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

      var wrapper = new _libWrappersWrapper2['default']({
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
        assert.equal(output, stats.assets[0]);
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
                  assert.equal(output, stats.assets[0]);
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
      var wrapper = new _libWrappersWrapper2['default']();
      assert.equal(wrapper.opts.outputPath, '');

      wrapper = new _libWrappersWrapper2['default']({
        outputPath: '/foo/bar'
      });

      assert.equal(wrapper.opts.outputPath, '/foo/bar');
    });
    it('should set a config\'s output.path prop', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({
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
      var wrapper = new _libWrappersWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        watch: false
      });

      wrapper.onceDone(function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        _libCaches2['default'].get(wrapper.opts, function (_err, _data) {
          assert.isNull(_err);
          assert.isObject(_data);

          assert.deepEqual(_data, data);

          done();
        });
      });
    });
  });
  describe('#data.urls', function () {
    it('should create urls relative to staticRoot', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: _path2['default'].join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urls);
        assert.equal(stats.urls.main.js[0], '/static/url/test/output.js');

        done();
      });
    });
    it('should handle staticUrl without a trailing slash', function (done) {
      var wrapper = new _libWrappersWrapper2['default']({
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: _path2['default'].join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static'
      });

      wrapper.compile(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urls);
        assert.equal(stats.urls.main.js[0], '/static/url/test/output.js');

        done();
      });
    });
  });
  describe('config factory', function () {
    it('should call the factory with the opts object', function (done) {
      var opts = {
        config: function config(_opts) {
          assert.strictEqual(_opts, opts);
          done();
        }
      };
      var wrapper = new _libWrappersWrapper2['default'](opts);

      wrapper.getConfig(function () {});
    });
  });
  describe('#opts.hmr', function () {
    it('should add hmr settings and entries', function (done) {
      var publicPath = '/static/foo';

      var wrapper = new _libWrappersWrapper2['default']({
        config: function config() {
          return {};
        },
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

        assert.equal(config.recordsPath, '/foo/bar/webpack.records-' + wrapper.opts.buildHash + '.json');

        done();
      });
    });
  });
});
//# sourceMappingURL=Wrapper.js.map