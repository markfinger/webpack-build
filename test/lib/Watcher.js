'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _libWrappersWatcher = require('../../lib/wrappers/Watcher');

var _libWrappersWatcher2 = _interopRequireDefault(_libWrappersWatcher);

var _libOptions = require('../../lib/options');

var _libOptions2 = _interopRequireDefault(_libOptions);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _test_bundlesBasic_bundleWebpackConfig = require('./test_bundles/basic_bundle/webpack.config');

var _test_bundlesBasic_bundleWebpackConfig2 = _interopRequireDefault(_test_bundlesBasic_bundleWebpackConfig);

var assert = _utils2['default'].assert;
var TEST_OUTPUT_DIR = _utils2['default'].TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _utils2['default'].cleanTestOutputDir();
});

describe('Watcher', function () {
  it('should be a function', function () {
    assert.isFunction(_libWrappersWatcher2['default']);
  });
  it('should accept compiler and option arguments', function () {
    var compiler = (0, _webpack2['default'])({});
    var opts = { buildHash: 'foo' };
    var watcher = new _libWrappersWatcher2['default'](compiler, opts);
    assert.strictEqual(watcher.compiler, compiler);
    assert.strictEqual(watcher.opts, opts);
  });
  describe('#onInvalid & #onDone', function () {
    it('should provide hooks into the compilation process', function (done) {
      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'hook_test', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'hook_test', 'output.js');
      var config = {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      };
      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__HOOK_TEST_ONE__";');

      var watcher = new _libWrappersWatcher2['default']((0, _webpack2['default'])(config), (0, _libOptions2['default'])());

      var onInvalidCalls = 0;
      watcher.onInvalid(function () {
        onInvalidCalls++;
      });

      var onDoneCalls = 0;
      watcher.onDone(function () {
        onDoneCalls++;
      });

      assert.equal(onInvalidCalls, 0);
      assert.equal(onDoneCalls, 0);

      watcher.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(onInvalidCalls, 0);
        assert.equal(onDoneCalls, 1);
        var onInvalidCalled = false;
        var onDoneCalled = false;
        watcher.onInvalid(_lodash2['default'].once(function () {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 1);
          onInvalidCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        watcher.onDone(_lodash2['default'].once(function () {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 2);
          onDoneCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        _fs2['default'].writeFileSync(entry, 'module.exports = "__HOOK_TEST_TWO__";');
      });
    });
  });
  describe('#onceReady', function () {
    it('should block until a bundle is generated', function (done) {
      var compiler = (0, _webpack2['default'])((0, _test_bundlesBasic_bundleWebpackConfig2['default'])());
      var watcher = new _libWrappersWatcher2['default'](compiler, (0, _libOptions2['default'])());
      watcher.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var outputPath = _path2['default'].join(TEST_OUTPUT_DIR, 'basic_bundle', 'output.js');
        assert.equal(stats.compilation.assets['output.js'].existsAt, outputPath);
        var content = _fs2['default'].readFileSync(outputPath);
        content = content.toString();
        assert.include(content, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(content, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
    it('should block until an invalidated bundle has been rebuilt', function (done) {
      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'output.js');
      var config = {
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      };
      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_ONE__";');
      var watcher = new _libWrappersWatcher2['default']((0, _webpack2['default'])(config), (0, _libOptions2['default'])({
        aggregateTimeout: 10
      }));
      watcher.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(stats.compilation.assets['output.js'].existsAt, output);
        var content = _fs2['default'].readFileSync(output);
        assert.include(content.toString(), '__INVALIDATED_BUNDLE_ONE__');
        setTimeout(function () {
          watcher.onInvalid(_lodash2['default'].once(function () {
            assert.isNull(watcher.err);
            assert.isNull(watcher.stats);
            watcher.onceDone(function (err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              content = _fs2['default'].readFileSync(output);
              assert.include(content.toString(), '__INVALIDATED_BUNDLE_TWO__');
              done();
            });
          }));
          _fs2['default'].writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_TWO__";');
        }, _utils2['default'].watcherWarmUpWait);
      });
    });
    it('should call onceDone if an error occurs', function (done) {
      var config = {
        context: '/path/does/not/exist/',
        entry: './some_file.js',
        output: {
          path: '/another/path/that/does/not/exist',
          filename: 'some_file.js'
        }
      };
      var watcher = new _libWrappersWatcher2['default']((0, _webpack2['default'])(config), (0, _libOptions2['default'])());

      watcher.onceDone(function (err) {
        assert.instanceOf(err, Error);
        done();
      });
    });
    it('should continue to detect changes and build the bundle', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'persistent_watch', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'persistent_watch', 'output.js');

      var compiler = (0, _webpack2['default'])({
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      var watcher = new _libWrappersWatcher2['default'](compiler, (0, _libOptions2['default'])());

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));

      _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_ONE__";');
      watcher.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        var contents = _fs2['default'].readFileSync(output);
        var compiledBundle = contents.toString();
        assert.include(compiledBundle, '__WATCH_TEST_ONE__');
        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');
          setTimeout(function () {
            watcher.onceDone(function (err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.compilation.assets['output.js'].existsAt);
              contents = _fs2['default'].readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');
              _fs2['default'].writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');
              setTimeout(function () {
                watcher.onceDone(function (err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.compilation.assets['output.js'].existsAt);
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
    it('should handle errors during compilation and preserve them', function (done) {
      this.timeout(_utils2['default'].watcherTimeout);

      var entry = _path2['default'].join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'entry.js');
      var output = _path2['default'].join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'output.js');

      _mkdirp2['default'].sync(_path2['default'].dirname(entry));
      _fs2['default'].writeFileSync(entry, 'module.exports = "__ERROR_TEST_ONE__";');

      var compiler = (0, _webpack2['default'])({
        context: _path2['default'].dirname(entry),
        entry: './' + _path2['default'].basename(entry),
        output: {
          path: _path2['default'].dirname(output),
          filename: _path2['default'].basename(output)
        }
      });

      var watcher = new _libWrappersWatcher2['default'](compiler, (0, _libOptions2['default'])({
        aggregateTimeout: _utils2['default'].aggregateTimeout
      }));

      watcher.onceDone(function (err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var contents = _fs2['default'].readFileSync(output);
        assert.include(contents.toString(), '__ERROR_TEST_ONE__');

        setTimeout(function () {
          _fs2['default'].writeFileSync(entry, '?+');
          setTimeout(function () {
            assert.isNotNull(watcher.err);
            assert.isNotNull(watcher.stats);
            watcher.onceDone(function (err1, stats1) {
              assert.instanceOf(err1, Error);
              assert.isObject(stats1);
              assert.strictEqual(err1, watcher.err);
              assert.strictEqual(stats1, watcher.stats);
              watcher.onceDone(function (err2, stats2) {
                assert.instanceOf(err2, Error);
                assert.strictEqual(err2, err1);
                assert.strictEqual(err2, watcher.err);
                assert.strictEqual(stats2, watcher.stats);

                _fs2['default'].writeFileSync(entry, 'module.exports = "__ERROR_TEST_TWO__";');
                setTimeout(function () {
                  watcher.onceDone(function (err3, stats3) {
                    assert.isNull(err3);
                    assert.notStrictEqual(stats3, stats1);
                    assert.isObject(stats3);
                    var contents = _fs2['default'].readFileSync(output);
                    assert.include(contents.toString(), '__ERROR_TEST_TWO__');

                    _fs2['default'].writeFileSync(entry, '+?;');
                    setTimeout(function () {
                      watcher.onceDone(function (err4, stats4) {
                        assert.instanceOf(err4, Error);
                        assert.notStrictEqual(err4, err1);
                        assert.strictEqual(err4, watcher.err);
                        assert.strictEqual(stats4, watcher.stats);
                        watcher.onceDone(function (err5, stats5) {
                          assert.instanceOf(err5, Error);
                          assert.notStrictEqual(err5, err1);
                          assert.strictEqual(err5, err4);
                          assert.strictEqual(err5, watcher.err);
                          assert.strictEqual(stats5, stats4);
                          assert.strictEqual(stats5, watcher.stats);

                          _fs2['default'].writeFileSync(entry, 'module.exports = "__ERROR_TEST_THREE__";');
                          setTimeout(function () {
                            watcher.onceDone(function (err6, stats6) {
                              assert.isNull(err6);
                              assert.notStrictEqual(stats6, stats1);
                              assert.isObject(stats6);
                              assert.strictEqual(err6, watcher.err);
                              assert.strictEqual(stats6, watcher.stats);
                              var contents = _fs2['default'].readFileSync(output);
                              assert.include(contents.toString(), '__ERROR_TEST_THREE__');
                              done();
                            });
                          }, _utils2['default'].watcherWait);
                        });
                      });
                    }, _utils2['default'].watcherWait);
                  });
                }, _utils2['default'].watcherWait);
              });
            });
          }, _utils2['default'].watcherWait);
        }, _utils2['default'].watcherWarmUpWait);
      });
    });
  });
});
//# sourceMappingURL=Watcher.js.map