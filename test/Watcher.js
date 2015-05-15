'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var webpack = require('webpack');
var MemoryFileSystem = require('memory-fs');
var Watcher = require('../lib/Watcher');
var utils = require('./utils');
var assert = utils.assert;
var TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  utils.cleanTestOutputDir();
});
afterEach(function() {
  utils.cleanTestOutputDir();
});

describe('Watcher', function() {
  it('should be a function', function() {
    assert.isFunction(Watcher);
  });
  it('should accept compiler and option arguments', function() {
    var compiler = webpack({});
    var opts = {};
    var watcher = new Watcher(compiler, opts);
    assert.strictEqual(watcher.compiler, compiler);
    assert.strictEqual(watcher.opts, opts);
  });
  it('should respect the useMemoryFS option', function() {
    var watcher = new Watcher(webpack({}), {
      useMemoryFS: false
    });
    assert.strictEqual(watcher.fs, fs);

    watcher = new Watcher(webpack({}), {
      useMemoryFS: true
    });
    assert.instanceOf(watcher.fs, MemoryFileSystem);
    assert.instanceOf(watcher.compiler.outputFileSystem, MemoryFileSystem);
  });
  describe('#onInvalid & #onDone', function() {
    it('should provide hooks into the compilation process', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'hook_test', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'hook_test', 'output.js');
      var config = {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      };
      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__HOOK_TEST_ONE__";');

      var watcher = new Watcher(webpack(config));

      var onInvalidCalls = 0;
      watcher.onInvalid(function() {
        onInvalidCalls++;
      });

      var onDoneCalls = 0;
      watcher.onDone(function() {
        onDoneCalls++;
      });

      assert.equal(onInvalidCalls, 0);
      assert.equal(onDoneCalls, 0);

      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(onInvalidCalls, 0);
        assert.equal(onDoneCalls, 1);
        var onInvalidCalled = false;
        var onDoneCalled = false;
        watcher.onInvalid(_.once(function() {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 1);
          onInvalidCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        watcher.onDone(_.once(function() {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 2);
          onDoneCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        fs.writeFileSync(entry, 'module.exports = "__HOOK_TEST_TWO__";');
      });
    });
  });
  describe('#onceReady', function() {
    it('should block until a bundle is generated', function(done) {
      var compiler = webpack(require('./test_bundles/basic_bundle/webpack.config'));
      var watcher = new Watcher(compiler);
      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var outputPath = path.join(TEST_OUTPUT_DIR, 'basic_bundle', 'output.js');
        assert.equal(stats.compilation.assets['output.js'].existsAt, outputPath);
        var content = watcher.fs.readFileSync(outputPath);
        content = content.toString();
        assert.include(content, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(content, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
    it('should block until an invalidated bundle has been rebuilt', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'output.js');
      var config = {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      };
      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_ONE__";');
      var watcher = new Watcher(webpack(config), {
        watchDelay: 10
      });
      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(stats.compilation.assets['output.js'].existsAt, output);
        var content = watcher.fs.readFileSync(output);
        assert.include(content.toString(), '__INVALIDATED_BUNDLE_ONE__');
        setTimeout(function() {
          watcher.onInvalid(_.once(function() {
            assert.isNull(watcher.err);
            assert.isNull(watcher.stats);
            watcher.onceDone(function(err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              content = watcher.fs.readFileSync(output);
              assert.include(content.toString(), '__INVALIDATED_BUNDLE_TWO__');
              done();
            });
          }));
          fs.writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_TWO__";');
        }, utils.watcherWarmUpWait);
      });
    });
    it('should call onceDone if an error occurs', function(done) {
      var config = {
        context: '/path/does/not/exist/',
        entry: './some_file.js',
        output: {
          path: '/another/path/that/does/not/exist',
          filename: 'some_file.js'
        }
      };
      var watcher = new Watcher(webpack(config));

      watcher.onceDone(function(err) {
        assert.instanceOf(err, Error);
        assert.include(err.stack, './some_file.js');
        assert.include(err.stack, '/path/does/not/exist/');
        done();
      });
    });
    it('should continue to detect changes and build the bundle', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'persistent_watch', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'persistent_watch', 'output.js');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler);

      mkdirp.sync(path.dirname(entry));

      fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_ONE__";');
      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        var contents = watcher.fs.readFileSync(output);
        var compiledBundle = contents.toString();
        assert.include(compiledBundle, '__WATCH_TEST_ONE__');
        setTimeout(function() {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');
          setTimeout(function() {
            watcher.onceDone(function(err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.compilation.assets['output.js'].existsAt);
              contents = watcher.fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');
              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');
              setTimeout(function() {
                watcher.onceDone(function(err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.compilation.assets['output.js'].existsAt);
                  contents = watcher.fs.readFileSync(output);
                  assert.include(contents.toString(), '__WATCH_TEST_THREE__');
                  done();
                });
              }, utils.watcherWait);
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
    it('should handle errors during compilation and preserve them', function(done) {
      this.timeout(5000);

      var entry = path.join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'output.js');

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_ONE__";');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler, {
        watchDelay: utils.watchDelay
      });

      //watcher.onDone(function(err, stats) {
      //  console.log('done', !!err, !!stats)
      //});
      //
      //watcher.onInvalid(function() {
      //  console.log('invalid')
      //});

      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        var contents = watcher.fs.readFileSync(output);
        assert.include(contents.toString(), '__ERROR_TEST_ONE__');

        setTimeout(function() {
          fs.writeFileSync(entry, '?+');
          setTimeout(function() {
            assert.isNotNull(watcher.err);
            assert.isNotNull(watcher.stats);
            watcher.onceDone(function(err1, stats1) {
              assert.instanceOf(err1, Error);
              assert.isObject(stats1);
              assert.strictEqual(err1, watcher.err);
              assert.strictEqual(stats1, watcher.stats);
              watcher.onceDone(function(err2, stats2) {
                assert.instanceOf(err2, Error);
                assert.strictEqual(err2, err1);
                assert.strictEqual(err2, watcher.err);
                assert.strictEqual(stats2, watcher.stats);

                fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_TWO__";');
                setTimeout(function() {
                  watcher.onceDone(function(err3, stats3) {
                    assert.isNull(err3);
                    assert.notStrictEqual(stats3, stats1);
                    assert.isObject(stats3);
                    var contents = watcher.fs.readFileSync(output);
                    assert.include(contents.toString(), '__ERROR_TEST_TWO__');

                    fs.writeFileSync(entry, '+?;');
                    setTimeout(function() {
                      watcher.onceDone(function(err4, stats4) {
                        assert.instanceOf(err4, Error);
                        assert.notStrictEqual(err4, err1);
                        assert.strictEqual(err4, watcher.err);
                        assert.strictEqual(stats4, watcher.stats);
                        watcher.onceDone(function(err5, stats5) {
                          assert.instanceOf(err5, Error);
                          assert.notStrictEqual(err5, err1);
                          assert.strictEqual(err5, err4);
                          assert.strictEqual(err5, watcher.err);
                          assert.strictEqual(stats5, stats4);
                          assert.strictEqual(stats5, watcher.stats);

                          fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_THREE__";');
                          setTimeout(function() {
                            watcher.onceDone(function (err6, stats6) {
                              assert.isNull(err6);
                              assert.notStrictEqual(stats6, stats1);
                              assert.isObject(stats6);
                              assert.strictEqual(err6, watcher.err);
                              assert.strictEqual(stats6, watcher.stats);
                              var contents = watcher.fs.readFileSync(output);
                              assert.include(contents.toString(), '__ERROR_TEST_THREE__');
                              done();
                            });
                          }, utils.watcherWait);
                        });
                      });
                    }, utils.watcherWait);
                  });
                }, utils.watcherWait);
              });
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
  });
  describe('#invalidate', function() {
    it('should force the compiler to rebuild', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'watcher_invalidate', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watcher_invalidate', 'output.js');

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__INVALID_TEST_ONE__";');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler);

      var invalidCount = 0;
      watcher.onInvalid(function() {
        invalidCount++;
      });

      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);

        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        assert.equal(invalidCount, 0);
        var contents = watcher.fs.readFileSync(output);
        assert.include(contents.toString(), '__INVALID_TEST_ONE__');

        setTimeout(function() {
          assert.equal(invalidCount, 1); // Weird bug where webpack immediately invalidates a bundle

          fs.writeFileSync(entry, 'module.exports = "__INVALID_TEST_TWO__";');

          watcher.invalidate();
          assert.equal(invalidCount, 2);
          assert.isNull(watcher.err);
          assert.isNull(watcher.stats);

          watcher.onceDone(function(err, stats) {
            assert.isNull(err);
            assert.isObject(stats);

            assert.equal(invalidCount, 3);

            var contents = watcher.fs.readFileSync(output);
            assert.include(contents.toString(), '__INVALID_TEST_TWO__');

            fs.writeFileSync(entry, 'module.exports = "__INVALID_TEST_THREE__";');

            watcher.invalidate();

            assert.isNull(watcher.err);
            assert.isNull(watcher.stats);
            assert.equal(invalidCount, 4);

            setTimeout(function() {
              watcher.onceDone(function(err, stats) {
                assert.isNull(err);
                assert.isObject(stats);

                var contents = watcher.fs.readFileSync(output);
                assert.include(contents.toString(), '__INVALID_TEST_THREE__');

                done();
              });
            }, utils.watcherWait);
          });
        }, utils.watcherWait);
      });
    });
  });
  describe('#fs', function() {
    it('should allow files to be read from memory and written to disk', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'rw_test', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'rw_test', 'output.js');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler, {
        watchDelay: 200
      });

      mkdirp.sync(path.dirname(entry));

      fs.writeFileSync(entry, 'module.exports = "__RW_TEST_ONE__";');
      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        var contents = watcher.fs.readFileSync(output);
        fs.writeFileSync(output, contents);
        contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__RW_TEST_ONE__');
        setTimeout(function() {

          fs.writeFileSync(entry, 'module.exports = "__RW_TEST_TWO__";');
          setTimeout(function() {
            watcher.onceDone(function(err, stats) {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.compilation.assets['output.js'].existsAt);
              contents = watcher.fs.readFileSync(output);
              fs.writeFileSync(output, contents);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__RW_TEST_TWO__');

              fs.writeFileSync(entry, 'module.exports = "__RW_TEST_THREE__";');
              setTimeout(function() {
                watcher.onceDone(function(err, stats) {
                  assert.isNull(err);
                  assert.isObject(stats);
                  contents = watcher.fs.readFileSync(output);
                  fs.writeFileSync(output, contents);
                  contents = fs.readFileSync(output);
                  assert.include(contents.toString(), '__RW_TEST_THREE__');
                  done();
                });
              }, utils.watcherWait);
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
  });
  describe('#writeAssets', function() {
    it('should async write files from memory to disk', function(done) {
      this.timeout(utils.watcherTimeout);

      var entry = path.join(TEST_OUTPUT_DIR, 'write_files_async', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'write_files_async', 'output.js');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler, {
        watchDelay: utils.watchDelay
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__ASYNC_WRITE_FILE_TEST_ONE__";');

      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        watcher.writeAssets(function(err, filenames) {
          assert.isNull(err);
          assert.isArray(filenames);
          assert.equal(filenames.length, 1);
          assert.equal(filenames[0], output);
          var contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__ASYNC_WRITE_FILE_TEST_ONE__');
          setTimeout(function() {
            fs.writeFileSync(entry, 'module.exports = "__ASYNC_WRITE_FILE_TEST_TWO__";');
            setTimeout(function() {
              watcher.onceDone(function(err, stats) {
                assert.isNull(err);
                assert.isObject(stats);
                watcher.writeAssets(function(err, filenames) {
                  assert.isNull(err);
                  assert.isArray(filenames);
                  assert.equal(filenames.length, 1);
                  assert.equal(filenames[0], output);
                  contents = fs.readFileSync(output);
                  assert.include(contents.toString(), '__ASYNC_WRITE_FILE_TEST_TWO__');
                  fs.writeFileSync(entry, 'module.exports = "__ASYNC_WRITE_FILE_TEST_THREE__";');
                  setTimeout(function() {
                    watcher.onceDone(function(err, stats) {
                      assert.isNull(err);
                      assert.isObject(stats);
                      watcher.writeAssets(function(err, filenames) {
                        assert.isNull(err);
                        assert.isArray(filenames);
                        assert.equal(filenames.length, 1);
                        assert.equal(filenames[0], output);
                        contents = fs.readFileSync(output);
                        assert.include(contents.toString(), '__ASYNC_WRITE_FILE_TEST_THREE__');
                        done();
                      });
                    });
                  }, utils.watcherWait);
                });
              });
            }, utils.watcherWait);
          }, utils.watcherWarmUpWait);
        });
      });
    });
    it('should create any necessary directories before writing files', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'write_assets_mkdirp', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'write_assets_mkdirp', 'nested_dir', 'and_another', 'output.js');

      var compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      var watcher = new Watcher(compiler);

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__ASYNC_WRITE_FILE_TEST_ONE__";');

      watcher.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        watcher.writeAssets(function(err, filenames) {
          assert.isNull(err);
          assert.isArray(filenames);
          assert.equal(filenames.length, 1);
          assert.equal(filenames[0], output);
          var contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__ASYNC_WRITE_FILE_TEST_ONE__');
          fs.writeFileSync(entry, 'module.exports = "__ASYNC_WRITE_FILE_TEST_TWO__";');
          done();
        });
      });
    });
  });
});