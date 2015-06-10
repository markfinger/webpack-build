import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import webpack from 'webpack';
import Wrapper from '../../lib/Wrapper';
import Watcher from '../../lib/Watcher';
import options from '../../lib/options';
import Cache from '../../lib/Cache';
import utils from './utils';

let assert = utils.assert;
let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  utils.cleanTestOutputDir();
});
afterEach(() => {
  utils.cleanTestOutputDir();
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
    assert.isTrue(wrapper.opts.watch);
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
      assert.strictEqual(config, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  it('should compile a basic bundle', (done) => {
    let wrapper = new Wrapper({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile((err, stats) => {
      assert.isNull(err);
      assert.isObject(stats);

      let existsAt = stats.pathsToAssets['output.js'];
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
  it('should expose the webpack config on the stats object', (done) => {
    let wrapper = new Wrapper({}, require('./test_bundles/basic_bundle/webpack.config'));

    wrapper.compile((err, stats) => {
      assert.isNull(err);
      assert.isObject(stats);
      assert.strictEqual(stats.webpackConfig, require('./test_bundles/basic_bundle/webpack.config'));
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

        // webpack inserts regexes which can't be serialized
        data.webpackConfig.module = null;
        // deepEqual checks hasOwnProperty
        delete data.buildOptions.poll;

        let serialized = JSON.stringify(data);
        //debugger
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
        assert.equal(output, stats.pathsToAssets['output.js']);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__REBUILT_TEST_ONE__');

        fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_TWO__";');
        wrapper.onceDone((err, stats) => {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__REBUILT_TEST_TWO__');

          fs.writeFileSync(entry, 'module.exports = "__REBUILT_TEST_THREE__";');
          wrapper.onceDone((err, stats) => {
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
    it('should default to true', () => {
      let wrapper = new Wrapper();
      assert.isTrue(wrapper.opts.watch);

      wrapper = new Wrapper({
        watch: false
      });

      assert.isFalse(wrapper.opts.watch);
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
        assert.equal(output, stats.pathsToAssets['output.js']);
        let contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__WATCH_TEST_ONE__');

        setTimeout(() => {
          fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');

          setTimeout(() => {
            wrapper.onceDone((err, stats) => {
              assert.isNull(err);
              assert.isObject(stats);
              assert.property(stats.pathsToAssets, 'output.js');
              assert.equal(output, stats.pathsToAssets['output.js']);
              contents = fs.readFileSync(output);
              assert.include(contents.toString(), '__WATCH_TEST_TWO__');

              fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_THREE__";');

              setTimeout(() => {
                wrapper.onceDone((err, stats) => {
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
        assert.equal(output, stats1.pathsToAssets['output.js']);
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
        assert.equal(output, stats.pathsToAssets['output.js']);
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
                  assert.equal(output, stats.pathsToAssets['output.js']);
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
      let cache = new Cache(
        options({cacheFile: path.join(TEST_OUTPUT_DIR, 'bundle_test_cache.json')})
      );
      assert.deepEqual(cache.data, {});

      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      }, null, cache);

      assert.strictEqual(wrapper.cache, cache);
      assert.isString(wrapper.opts.config);

      wrapper.onceDone((err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        cache.get((err, entry) => {
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
  describe('#stats.urlsToAssets', () => {
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

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

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

        assert.isObject(stats.urlsToAssets);
        assert.equal(stats.urlsToAssets['output.js'], '/static/url/test/output.js');

        done();
      });
    });
  });
  describe('#stats.rendered', () => {
    it('should create rendered elements using staticRoot and staticUrl', (done) => {
      let wrapper = new Wrapper({
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js'),
        outputPath: path.join(TEST_OUTPUT_DIR, 'url', 'test'),
        staticRoot: TEST_OUTPUT_DIR,
        staticUrl: '/static/'
      });

      wrapper.compile((err, stats) => {
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
  describe('#opts.env', () => {
    it('should call the function matched on the config object', (done) => {
      let wrapper = new Wrapper({
        config: {
          env: {
            foo: () => {
              done();
            }
          }
        },
        env: 'foo'
      });

      wrapper.getConfig(() =>{});
    });
    it('should provide the config and opts objects', (done) => {
      let opts = {
        env: 'foo'
      };

      let config = {
        env: {
          foo: (_config, _opts) => {
            assert.strictEqual(_config, config);
            assert.strictEqual(_opts, opts);
            done();
          }
        }
      };

      opts.config = config;

      let wrapper = new Wrapper(opts);

      wrapper.getConfig(() =>{});
    });
    it('should accept mutations to the config object', (done) => {
      let wrapper = new Wrapper({
        config: {
          env: {
            foo: (config) => {
              config.devtool = 'eval';
            }
          }
        },
        env: 'foo'
      });

      wrapper.getConfig((err, config) => {
        assert.isNull(err);
        assert.isObject(config);

        assert.equal(config.devtool, 'eval');
        done();
      });
    });
  });
  describe('#opts.hmr', () => {
    it('should add hmr settings and entries', (done) => {
      let publicPath = '/static/foo';

      let wrapper = new Wrapper({
        config: {},
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