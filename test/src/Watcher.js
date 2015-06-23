import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import Watcher from '../../lib/wrappers/Watcher';
import options from '../../lib/options';
import utils from './utils';
import basic_bundle from './test_bundles/basic_bundle/webpack.config';

let assert = utils.assert;
let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  utils.cleanTestOutputDir();
});
afterEach(() => {
  utils.cleanTestOutputDir();
});

describe('Watcher', () => {
  it('should be a function', () => {
    assert.isFunction(Watcher);
  });
  it('should accept compiler and option arguments', () => {
    let compiler = webpack({});
    let opts = {buildHash:'foo'};
    let watcher = new Watcher(compiler, opts);
    assert.strictEqual(watcher.compiler, compiler);
    assert.strictEqual(watcher.opts, opts);
  });
  describe('#onInvalid & #onDone', () => {
    it('should provide hooks into the compilation process', (done) => {
      let entry = path.join(TEST_OUTPUT_DIR, 'hook_test', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'hook_test', 'output.js');
      let config = {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      };
      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__HOOK_TEST_ONE__";');

      let watcher = new Watcher(webpack(config), options());

      let onInvalidCalls = 0;
      watcher.onInvalid(() => {
        onInvalidCalls++;
      });

      let onDoneCalls = 0;
      watcher.onDone(() => {
        onDoneCalls++;
      });

      assert.equal(onInvalidCalls, 0);
      assert.equal(onDoneCalls, 0);

      watcher.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(onInvalidCalls, 0);
        assert.equal(onDoneCalls, 1);
        let onInvalidCalled = false;
        let onDoneCalled = false;
        watcher.onInvalid(_.once(() => {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 1);
          onInvalidCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        watcher.onDone(_.once(() => {
          assert.equal(onInvalidCalls, 1);
          assert.equal(onDoneCalls, 2);
          onDoneCalled = true;
          onDoneCalled && onInvalidCalled && done();
        }));
        fs.writeFileSync(entry, 'module.exports = "__HOOK_TEST_TWO__";');
      });
    });
  });
  describe('#onceReady', () => {
    it('should block until a bundle is generated', (done) => {
      let compiler = webpack(basic_bundle());
      let watcher = new Watcher(compiler, options());
      watcher.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        let outputPath = path.join(TEST_OUTPUT_DIR, 'basic_bundle', 'output.js');
        assert.equal(stats.compilation.assets['output.js'].existsAt, outputPath);
        let content = fs.readFileSync(outputPath);
        content = content.toString();
        assert.include(content, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(content, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
    it('should block until an invalidated bundle has been rebuilt', (done) => {
      let entry = path.join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'invalidated_bundle', 'output.js');
      let config = {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      };
      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_ONE__";');
      let watcher = new Watcher(webpack(config), options({
        aggregateTimeout: 10
      }));
      watcher.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(stats.compilation.assets['output.js'].existsAt, output);
        let content = fs.readFileSync(output);
        assert.include(content.toString(), '__INVALIDATED_BUNDLE_ONE__');
        setTimeout(() => {
          watcher.onInvalid(_.once(() => {
            assert.isNull(watcher.err);
            assert.isNull(watcher.stats);
            watcher.onceDone((err, stats) => {
              assert.isNull(err);
              assert.isObject(stats);
              content = fs.readFileSync(output);
              assert.include(content.toString(), '__INVALIDATED_BUNDLE_TWO__');
              done();
            });
          }));
          fs.writeFileSync(entry, 'module.exports = "__INVALIDATED_BUNDLE_TWO__";');
        }, utils.watcherWarmUpWait);
      });
    });
    it('should call onceDone if an error occurs', (done) => {
      let config = {
        context: '/path/does/not/exist/',
        entry: './some_file.js',
        output: {
          path: '/another/path/that/does/not/exist',
          filename: 'some_file.js'
        }
      };
      let watcher = new Watcher(webpack(config), options());

      watcher.onceDone((err) => {
        assert.instanceOf(err, Error);
        done();
      });
    });
    it('should continue to detect changes and build the bundle', function(done) {
      this.timeout(utils.watcherTimeout);

      let entry = path.join(TEST_OUTPUT_DIR, 'persistent_watch', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'persistent_watch', 'output.js');

      let compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      let watcher = new Watcher(compiler, options());

      mkdirp.sync(path.dirname(entry));

      fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_ONE__";');
      watcher.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.compilation.assets['output.js'].existsAt);
        let contents = fs.readFileSync(output);
        let compiledBundle = contents.toString();
        assert.include(compiledBundle, '__WATCH_TEST_ONE__');
        setTimeout(() => {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');
          setTimeout(() => {
            watcher.onceDone((err, stats) => {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.compilation.assets['output.js'].existsAt);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');
              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');
              setTimeout(() => {
                watcher.onceDone((err, stats) => {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.compilation.assets['output.js'].existsAt);
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
    it('should handle errors during compilation and preserve them', function(done) {
      this.timeout(utils.watcherTimeout);

      let entry = path.join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'watcher_caches_errors', 'output.js');

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_ONE__";');

      let compiler = webpack({
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      let watcher = new Watcher(compiler, options({
        aggregateTimeout: utils.aggregateTimeout
      }));

      watcher.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__ERROR_TEST_ONE__');

        setTimeout(() => {
          fs.writeFileSync(entry, '?+');
          setTimeout(() => {
            assert.isNotNull(watcher.err);
            assert.isNotNull(watcher.stats);
            watcher.onceDone((err1, stats1) => {
              assert.instanceOf(err1, Error);
              assert.isObject(stats1);
              assert.strictEqual(err1, watcher.err);
              assert.strictEqual(stats1, watcher.stats);
              watcher.onceDone((err2, stats2) => {
                assert.instanceOf(err2, Error);
                assert.strictEqual(err2, err1);
                assert.strictEqual(err2, watcher.err);
                assert.strictEqual(stats2, watcher.stats);

                fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_TWO__";');
                setTimeout(() => {
                  watcher.onceDone((err3, stats3) => {
                    assert.isNull(err3);
                    assert.notStrictEqual(stats3, stats1);
                    assert.isObject(stats3);
                    let contents = fs.readFileSync(output);
                    assert.include(contents.toString(), '__ERROR_TEST_TWO__');

                    fs.writeFileSync(entry, '+?;');
                    setTimeout(() => {
                      watcher.onceDone((err4, stats4) => {
                        assert.instanceOf(err4, Error);
                        assert.notStrictEqual(err4, err1);
                        assert.strictEqual(err4, watcher.err);
                        assert.strictEqual(stats4, watcher.stats);
                        watcher.onceDone((err5, stats5) => {
                          assert.instanceOf(err5, Error);
                          assert.notStrictEqual(err5, err1);
                          assert.strictEqual(err5, err4);
                          assert.strictEqual(err5, watcher.err);
                          assert.strictEqual(stats5, stats4);
                          assert.strictEqual(stats5, watcher.stats);

                          fs.writeFileSync(entry, 'module.exports = "__ERROR_TEST_THREE__";');
                          setTimeout(() => {
                            watcher.onceDone((err6, stats6) => {
                              assert.isNull(err6);
                              assert.notStrictEqual(stats6, stats1);
                              assert.isObject(stats6);
                              assert.strictEqual(err6, watcher.err);
                              assert.strictEqual(stats6, watcher.stats);
                              let contents = fs.readFileSync(output);
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
});