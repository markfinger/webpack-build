import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import Wrapper from '../../lib/wrappers/Wrapper';
import Watcher from '../../lib/wrappers/Watcher';
import options from '../../lib/options';
import caches from '../../lib/caches';
import utils from './utils';
import basic_bundle from './test_bundles/basic_bundle/webpack.config';
import library_bundle from './test_bundles/library_bundle/webpack.config';

let assert = utils.assert;
let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  utils.cleanTestOutputDir();
  caches.clear();
});
afterEach(() => {
  utils.cleanTestOutputDir();
  caches.clear();
});

describe('Wrapper', () => {
  it('should be a function', () => {
    assert.isFunction(Wrapper);
  });
  it('should accept options and config arguments', () => {
    let opts = {};
    let config = {};
    let wrapper = new Wrapper(opts, config);
    assert.strictEqual(wrapper.opts, opts);
    assert.strictEqual(wrapper.config, config);
    assert.isFalse(wrapper.opts.watch);
    assert.isNumber(wrapper.opts.aggregateTimeout);
    assert.isUndefined(wrapper.opts.poll);
    assert.equal(wrapper.opts.outputPath, '');
    assert.equal(wrapper.opts.staticRoot, '');
    assert.equal(wrapper.opts.staticUrl, '');
  });
  it('should accept a string as a config option and import the file specified', (done) => {
    let wrapper = new Wrapper({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    wrapper.getConfig((err, config) => {
      assert.isNull(err);
      assert.deepEqual(config, basic_bundle());
      done();
    });
  });
  it('should compile a basic bundle', (done) => {
    let wrapper = new Wrapper({}, basic_bundle());

    wrapper.compile((err, stats) => {
      assert.isNull(err);
      assert.isObject(stats);

      let existsAt = stats.assets[0];
      assert.isString(existsAt);
      fs.readFile(existsAt, (err, contents) => {
        assert.isNull(err);
        let compiledWrapper = contents.toString();
        assert.include(compiledWrapper, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledWrapper, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  it('should compile a bundle with multiple chunks', (done) => {
    let wrapper = new Wrapper({
      config: path.join(__dirname, 'test_bundles', 'multiple_chunks', 'webpack.config.js')
    });

    wrapper.compile((err, data) => {
      assert.isNull(err);
      assert.isObject(data);

      assert.isObject(data.output.one);
      assert.isObject(data.output.two);
      assert.isObject(data.output.three);

      assert.isString(data.output.one.js[0]);
      assert.isString(data.output.two.js[0]);
      assert.isString(data.output.three.js[0]);

      let contents = fs.readFileSync(data.output.one.js[0]).toString();
      assert.include(contents, '__ONE__');

      contents = fs.readFileSync(data.output.two.js[0]).toString();
      assert.include(contents, '__TWO__');

      contents = fs.readFileSync(data.output.three.js[0]).toString();
      assert.include(contents, '__THREE__');
      done();
    });
  });
  it('should expose the output options object', (done) => {
    let wrapper = new Wrapper({}, library_bundle());

    wrapper.compile((err, data) => {
      assert.isNull(err);
      assert.isObject(data.outputOptions);
      assert.equal(data.outputOptions.library, 'foo');
      assert.equal(data.outputOptions.libraryTarget, 'var');
      done();
    });
  });
  describe('#getCompiler', () => {
    it('should not preserved the compiler', (done) => {
      let wrapper = new Wrapper({}, {});

      wrapper.getCompiler((err, compiler1) => {
        assert.isNull(err);
        assert.isObject(compiler1);
        wrapper.getCompiler((err, compiler2) => {
          assert.isNull(err);
          assert.isObject(compiler2);
          assert.notStrictEqual(compiler1, compiler2);
          done();
        });
      });
    });
  });
  describe('#getWatcher', () => {
    it('should provide an instance of Watcher', (done) => {
      let wrapper = new Wrapper({watch: true}, {});

      wrapper.getWatcher((err, watcher) => {
        assert.isNull(err);
        assert.instanceOf(watcher, Watcher);
        done();
      });
    });
    it('should preserve the watcher', (done) => {
      let wrapper = new Wrapper({watch: true}, {});

      wrapper.getWatcher((err, watcher1) => {
        assert.isNull(err);
        assert.isObject(watcher1);

        wrapper.getWatcher((err, watcher2) => {
          assert.isNull(err);
          assert.isObject(watcher2);

          assert.strictEqual(watcher2, watcher1);
          done();
        });
      });
    });
  });
  describe('#generateOutput', () => {
    it('should produce a serializable form of the compilation\'s output', (done) => {
      let wrapper = new Wrapper({
        watch: false,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone((err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        // deepEqual checks hasOwnProperty
        delete data.buildOptions.poll;

        let serialized = JSON.stringify(data);
        assert.deepEqual(JSON.parse(serialized), data);

        done();
      });
    });
  });
  describe('#onceDone', () => {
    it('should not preserve errors and stats from the compilation, if not watching', (done) => {
      let wrapper = new Wrapper({
        watch: false,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone((err1, stats1) => {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone((err2, stats2) => {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.notStrictEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should preserve errors and stats from the compilation, if watching', (done) => {
      let wrapper = new Wrapper({
        watch: true,
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      });

      wrapper.onceDone((err1, stats1) => {
        assert.isNull(err1);
        assert.isObject(stats1);

        wrapper.onceDone((err2, stats2) => {
          assert.isNull(err2);
          assert.isObject(stats2);
          assert.deepEqual(stats2, stats1);
          done();
        });
      });
    });
    it('should rebuild wrappers when onceDone is called', (done) => {
      let entry = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'rebuilt_bundles', 'output.js');

      let wrapper = new Wrapper({
        watch: false
      }, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));
      fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_ONE__";');

      wrapper.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.assets[0]);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        wrapper.onceDone((err, stats) => {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.assets[0]);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          wrapper.onceDone((err, stats) => {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.assets[0]);
            contents = fs.readFileSync(output);
            assert.include(contents.toString(), '__REBUILT_TEST_THREE__');
            done();
          });
        });
      });
    });
  });
  describe('#opts.aggregateTimeout', () => {
    it('should default to 200', () => {
      let wrapper = new Wrapper();
      assert.equal(wrapper.opts.aggregateTimeout, 200);

      wrapper = new Wrapper({
        aggregateTimeout: 300
      });

      assert.equal(wrapper.opts.aggregateTimeout, 300);
    });
    it('should be passed to the watcher', (done) => {
      let wrapper = new Wrapper({}, {});
      wrapper.getWatcher((err, watcher) => {
        assert.isNull(err);
        assert.equal(watcher.opts.aggregateTimeout, 200);

        wrapper = new Wrapper({
          aggregateTimeout: 300
        }, {});

        wrapper.getWatcher((err, watcher) => {
          assert.isNull(err);
          assert.equal(watcher.opts.aggregateTimeout, 300);
          done();
        });
      });
    });
  });
  describe('#opts.watch', () => {
    it('should default to false', () => {
      let wrapper = new Wrapper();
      assert.isFalse(wrapper.opts.watch);

      wrapper = new Wrapper({
        watch: true
      });

      assert.isTrue(wrapper.opts.watch);
    });
    it('should cause file changes to trigger bundle rebuilds', function(done) {
      this.timeout(utils.watcherTimeout);

      let entry = path.join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      let wrapper = new Wrapper({
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

      wrapper.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.assets[0]);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(() => {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(() => {
            wrapper.onceDone((err, stats) => {
              assert.isNull(err);
              assert.isObject(stats);
              assert.equal(output, stats.assets[0]);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(() => {
                wrapper.onceDone((err, stats) => {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.assets[0]);
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

      let entry = path.join(TEST_OUTPUT_DIR, 'watched_file_error', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'watched_file_error', 'output.js');

      let wrapper = new Wrapper({
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

      wrapper.onceDone((err1, stats1) => {
        assert.isNull(err1);
        assert.isObject(stats1);
        assert.equal(output, stats1.assets[0]);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(() => {
          fs.writeFileSync(entry, '+?');

          setTimeout(() => {
            wrapper.onceDone((err2, stats2) => {
              assert.instanceOf(err2, Error);
              assert.isObject(stats2);

              wrapper.onceDone((err3, stats3) => {
                assert.instanceOf(err3, Error);
                assert.isObject(stats3);
                assert.strictEqual(err3, err2);
                assert.deepEqual(stats3, stats2);

                done();
              });
            });
          }, utils.watcherWait);
        }, utils.watcherWarmUpWait);
      });
    });
    it('should continue to compile if a file change introduces an error', function(done) {
      this.timeout(utils.watcherTimeout);

      let entry = path.join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'entry.js');
      let output = path.join(TEST_OUTPUT_DIR, 'watched_file_continues_to_compile', 'output.js');

      let wrapper = new Wrapper({
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

      wrapper.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.assets[0]);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCHED_FILE_ERROR_ONE__');

        setTimeout(() => {
          fs.writeFileSync(entry, '+?');

          setTimeout(() => {
            wrapper.onceDone((err, stats) => {
              assert.instanceOf(err, Error);
              assert.isObject(stats);

              fs.writeFileSync(entry, '__WATCHED_FILE_ERROR_TWO__');

              setTimeout(() => {
                wrapper.onceDone((err, stats) => {
                  assert.isNull(err);
                  assert.isObject(stats);
                  assert.equal(output, stats.assets[0]);
                  let contents = fs.readFileSync(output);
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
  describe('#opts.outputPath', () => {
    it('should default to an empty string', () => {
      let wrapper = new Wrapper();
      assert.equal(wrapper.opts.outputPath, '');

      wrapper = new Wrapper({
        outputPath: '/foo/bar'
      });

      assert.equal(wrapper.opts.outputPath, '/foo/bar');
    });
    it('should set a config\'s output.path prop', (done) => {
      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'output_path_bundle', 'webpack.config.js'),
        outputPath: '/some/path/'
      });

      wrapper.getConfig((err, config) => {
        assert.isNull(err);
        assert.equal(config.context, 'context');
        assert.equal(config.entry, 'entry');
        assert.equal(config.output.path, '/some/path/');
        assert.equal(config.output.filename, 'test.js');
        done();
      });
    });
  });
  describe('#cache', () => {
    it('should be able to populate a cache', (done) => {
      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        watch: false
      });

      wrapper.onceDone((err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        caches.get(wrapper.opts, (_err, _data) => {
          assert.isNull(_err);
          assert.isObject(_data);

          assert.deepEqual(_data, data);

          done();
        });
      });
    });
  });
  describe('#data.urls', () => {
    it('should create urls relative to staticRoot', (done) => {
      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urls);
        assert.equal(stats.urls.main.js[0], '/static/url/test/output.js');

        done();
      });
    });
    it('should handle staticUrl without a trailing slash', (done) => {
      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static'
      });

      wrapper.compile((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isObject(stats.urls);
        assert.equal(stats.urls.main.js[0], '/static/url/test/output.js');

        done();
      });
    });
  });
  describe('config factory', () => {
    it('should call the factory with the opts object', (done) => {
      let opts = {
        config: (_opts) => {
          assert.strictEqual(_opts, opts);
          done();
        }
      };
      let wrapper = new Wrapper(opts);

      wrapper.getConfig(() =>{});
    });
  });
  describe('#opts.hmr', () => {
    it('should add hmr settings and entries', (done) => {
      let publicPath = '/static/foo';

      let wrapper = new Wrapper({
        config: () => { return {}; },
        hmr: true,
        hmrRoot: 'http://test.com',
        outputPath: '/foo/bar',
        publicPath: publicPath
      });

      wrapper.getConfig((err, config) => {
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