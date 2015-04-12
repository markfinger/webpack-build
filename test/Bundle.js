var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var assert = require('chai').assert;
var Bundle = require('../lib/Bundle');

var TEST_OUTPUT_DIR = path.join(__dirname, 'bundle_test_output');

// Ensure we have a clean slate before and after each test
beforeEach(function() {
  Bundle._resetFileWatcher();
  // The file watcher seems to be really inconsistent unless we punch in a
  // random file before we start using it
  Bundle._fileWatcher.add(module.filename);
  child_process.spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
});
afterEach(function() {
  Bundle._resetFileWatcher();
  child_process.spawnSync('rm', ['-rf', TEST_OUTPUT_DIR]);
});

describe('Bundle', function() {
  it('is a function', function() {
    assert.isFunction(Bundle);
  });
  it('can accept options and config arguments', function() {
    var opts = {};
    var config = {};
    var bundle = new Bundle(opts, config);
    assert.strictEqual(bundle.opts, opts);
    assert.strictEqual(bundle.config, config);
    assert.isFalse(bundle.opts.cache);
    assert.isFalse(bundle.opts.watchConfig);
    assert.isFalse(bundle.opts.watch);
    assert.isNull(bundle.opts.bundleDir);
  });
  it('can accept a string as a config option and the file will be required', function(done) {
    var bundle = new Bundle({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    });
    bundle.getConfig(function(err, config) {
      assert.isNull(err);
      assert.strictEqual(config, require('./test_bundles/basic_bundle/webpack.config'));
      done();
    });
  });
  it('can compile a basic bundle', function(done) {
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
  it('tracks compilation state', function(done) {
    var bundle = new Bundle({}, require('./test_bundles/basic_bundle/webpack.config'));

    assert.isFalse(bundle.isCompiling);
    assert.isFalse(bundle.hasCompiled);
    assert.isNull(bundle.compiler);

    bundle.compile(function(err, stats) {
      assert.isFalse(bundle.isCompiling);
      assert.isTrue(bundle.hasCompiled);

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

    assert.isTrue(bundle.isCompiling);
    assert.isFalse(bundle.hasCompiled);
  });
  it('records the output of the last compilation', function(done) {
    var bundle = new Bundle({
      cache: true
    }, require('./test_bundles/basic_bundle/webpack.config'));

    assert.isNull(bundle.err);
    assert.isNull(bundle.stats);

    bundle.compile(function(err, stats) {
      assert.isNull(bundle.err);
      assert.isObject(bundle.stats);
      assert.strictEqual(err, bundle.err);
      assert.strictEqual(stats, bundle.stats);

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

    assert.isNull(bundle.err);
    assert.isNull(bundle.stats);
  });
  it('can defer concurrent compilation requests until done', function(done) {
    var bundle = new Bundle({
      cache: true
    }, require('./test_bundles/basic_bundle/webpack.config'));

    assert.isFalse(bundle.isCompiling);
    assert.isFalse(bundle.hasCompiled);
    assert.isArray(bundle._onceDone);
    assert.equal(bundle._onceDone.length, 0);

    var cb1 = function(err, stats) {
      assert.isFalse(bundle.isCompiling);
      assert.isTrue(bundle.hasCompiled);
      assert.equal(bundle._onceDone.length, 0);
      assert.strictEqual(err, bundle.err);
      assert.strictEqual(stats, bundle.stats);
    };

    bundle.onceDone(cb1);
    assert.isTrue(bundle.isCompiling);
    assert.isFalse(bundle.hasCompiled);
    assert.equal(bundle._onceDone.length, 1);
    assert.strictEqual(bundle._onceDone[0], cb1);

    var cb2 = function(err, stats) {
      assert.isFalse(bundle.isCompiling);
      assert.isTrue(bundle.hasCompiled);
      assert.equal(bundle._onceDone.length, 0);
      assert.strictEqual(err, bundle.err);
      assert.strictEqual(stats, bundle.stats);

      done();
    };

    bundle.onceDone(cb2);
    assert.isTrue(bundle.isCompiling);
    assert.isFalse(bundle.hasCompiled);
    assert.equal(bundle._onceDone.length, 2);
    assert.strictEqual(bundle._onceDone[0], cb1);
    assert.strictEqual(bundle._onceDone[1], cb2);
  });
  it('can cache compilation output', function(done) {
    var bundle = new Bundle({
      cache: true
    }, require('./test_bundles/basic_bundle/webpack.config'));

    bundle.onceDone(function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      bundle.onceDone(function(_err, _stats) {
        assert.strictEqual(err, _err);
        assert.strictEqual(stats, _stats);

        bundle.onceDone(function(__err, __stats) {
          assert.strictEqual(_err, __err);
          assert.strictEqual(_stats, __stats);

          done();
        });
      });
    });
  });
  it('can invalidate cached compilation output', function(done) {
    var bundle = new Bundle({
      cache: true
    }, require('./test_bundles/basic_bundle/webpack.config'));

    bundle.onceDone(function(err, stats) {
      assert.isNull(err);
      assert.isObject(stats);

      bundle.invalidate();

      bundle.onceDone(function(_err, _stats) {
        assert.isNull(_err);
        assert.notStrictEqual(stats, _stats);
        assert.isObject(_stats);

        bundle.onceDone(function(__err, __stats) {
          assert.strictEqual(_err, __err);
          assert.strictEqual(_stats, __stats);

          done();
        });
      });
    });
  });
  it('can detect changes to a particular file', function(done) {
    var testFile = path.join(TEST_OUTPUT_DIR, 'watch_test', 'test.js');

    mkdirp.sync(path.dirname(testFile));

    var bundle = new Bundle();

    fs.writeFileSync(testFile, 'test 1');

    assert.isUndefined(Bundle._watchedFiles[testFile]);
    var changesDetected = 0;
    bundle.watchFile(testFile, function() {
      changesDetected++;
    });

    assert.isArray(Bundle._watchedFiles[testFile]);
    assert.equal(Bundle._watchedFiles[testFile].length, 1);
    assert.equal(changesDetected, 0);

    fs.writeFileSync(testFile, 'test 2');
    assert.equal(Bundle._watchedFiles[testFile].length, 1);

    bundle.watchFile(testFile, _.once(function() {
      assert.equal(changesDetected, 1);
      bundle.watchFile(testFile, _.once(function() {
        assert.equal(changesDetected, 2);
        done();
      }));
      assert.equal(Bundle._watchedFiles[testFile].length, 3);
      fs.writeFileSync(testFile, 'test 3');
    }));

    assert.equal(Bundle._watchedFiles[testFile].length, 2);
  });
  describe('#opts.watchConfig', function() {
    it('defaults to false', function() {
      var bundle = new Bundle();
      assert.isFalse(bundle.opts.watchConfig);

      bundle = new Bundle({
        watchConfig: true
      });
      assert.isTrue(bundle.opts.watchConfig);
    });
    it('can detect changes to the config file', function(done) {
      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'detect_changes_to_config_watch_test', 'webpack.config.js'),
        watchConfig: true
      };
      var bundle = new Bundle(opts);

      var invalidatedConfigCount = 0;

      bundle.invalidateConfig = function() {
        invalidatedConfigCount++;
      };

      mkdirp.sync(path.dirname(opts.config));

      fs.writeFileSync(opts.config, '{}');
      assert.isUndefined(Bundle._watchedFiles[opts.config]);
      bundle.getConfig(function(err) {
        assert.isNull(err);
        assert.isArray(Bundle._watchedFiles[opts.config]);
        assert.equal(Bundle._watchedFiles[opts.config].length, 1);
        assert.equal(invalidatedConfigCount, 0);
        bundle.watchFile(opts.config, _.once(function() {
          assert.equal(invalidatedConfigCount, 1);
          assert.equal(Bundle._watchedFiles[opts.config].length, 2);
          bundle.watchFile(opts.config, _.once(function() {
            assert.equal(invalidatedConfigCount, 2);
            done();
          }));
          assert.equal(Bundle._watchedFiles[opts.config].length, 3);
          fs.writeFileSync(opts.config, '  {}');
        }));
        assert.equal(Bundle._watchedFiles[opts.config].length, 2);
        fs.writeFileSync(opts.config, ' {}');
      });
    });
    it('can detect changes to the config file and invalidate the config', function(done) {
      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'invalidate_config_watch_test', 'webpack.config.js'),
        watchConfig: true
      };
      var bundle = new Bundle(opts);

      mkdirp.sync(path.dirname(opts.config));

      fs.writeFileSync(opts.config, 'module.exports = {test:1};');
      bundle.getConfig(function(err, config) {
        assert.isNull(err);
        assert.isObject(config);
        assert.strictEqual(bundle.config, config);
        assert.equal(config.test, 1);
        bundle.watchFile(opts.config, _.once(function() {
          assert.isNull(bundle.config);
          bundle.getConfig(function(err, config) {
            assert.isNull(err);
            assert.isObject(config);
            assert.strictEqual(bundle.config, config);
            assert.equal(config.test, 2);
            bundle.watchFile(opts.config, _.once(function() {
              assert.isNull(bundle.config);
              bundle.getConfig(function(err, config) {
                assert.isNull(err);
                assert.isObject(config);
                assert.strictEqual(bundle.config, config);
                assert.equal(config.test, 3);
                done();
              });
            }));
            fs.writeFileSync(opts.config, 'module.exports = {test:3};');
          });
        }));
        fs.writeFileSync(opts.config, 'module.exports = {test:2};');
      });
    });
    it('can detect changes to a config file and rebuild the bundle whenever the config has been invalidated', function(done) {
      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'watch_config_to_invalidate_bundle', 'webpack.config.js'),
        watchConfig: true
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
        bundle.watchFile(opts.config, _.once(function() {
          bundle.onceDone(function(err, stats) {
            var existsAt = stats.pathsToAssets['output.js'];
            assert.isString(existsAt);
            contents = fs.readFileSync(existsAt);
            assert.include(contents.toString(), '__WATCHED_CONFIG_TWO__');
            bundle.watchFile(opts.config, _.once(function() {
              bundle.onceDone(function(err, stats) {
                var existsAt = stats.pathsToAssets['output.js'];
                assert.isString(existsAt);
                contents = fs.readFileSync(existsAt);
                assert.include(contents.toString(), '__WATCHED_CONFIG_THREE__');
                done();
              });
            }));
            fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));
          });
        }));
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));
      });
    });
    it('can detect changes to a config file and invalidate the watcher', function(done) {
      var opts = {
        config: path.join(TEST_OUTPUT_DIR, 'watched_source_and_config_bundle', 'webpack.config.js'),
        watchConfig: true,
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

      assert.isFalse(bundle.watchingConfig);
      assert.isFalse(bundle.watching);
      assert.isNull(bundle.watcher);

      mkdirp.sync(path.dirname(opts.config));

      fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_1));
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.isTrue(bundle.watchingConfig);
        assert.isTrue(bundle.watching);
        assert.isObject(bundle.watcher);
        var existsAt = stats.pathsToAssets['output.js'];
        assert.isString(existsAt);
        var contents = fs.readFileSync(existsAt);
        assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_ONE__');
        bundle.watchFile(opts.config, _.once(function() {
          assert.isTrue(bundle.watchingConfig);
          assert.isFalse(bundle.watching);
          assert.isNull(bundle.watcher);
          bundle.onceDone(function(err, stats) {
            assert.isTrue(bundle.watchingConfig);
            assert.isTrue(bundle.watching);
            assert.isObject(bundle.watcher);
            var existsAt = stats.pathsToAssets['output.js'];
            assert.isString(existsAt);
            contents = fs.readFileSync(existsAt);
            assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_TWO__');
            bundle.watchFile(opts.config, _.once(function() {
              assert.isTrue(bundle.watchingConfig);
              assert.isFalse(bundle.watching);
              assert.isNull(bundle.watcher);
              bundle.onceDone(function(err, stats) {
                assert.isTrue(bundle.watchingConfig);
                assert.isTrue(bundle.watching);
                assert.isObject(bundle.watcher);
                var existsAt = stats.pathsToAssets['output.js'];
                assert.isString(existsAt);
                contents = fs.readFileSync(existsAt);
                assert.include(contents.toString(), '__WATCHED_SOURCE_AND_CONFIG_THREE__');
                done();
              });
            }));
            fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_3));
          });
        }));
        fs.writeFileSync(opts.config, 'module.exports = ' + JSON.stringify(config_2));
      });
    });
  });
  describe('#opts.watchDelay', function() {
    it('defaults to 200', function () {
      var bundle = new Bundle();
      assert.equal(bundle.opts.watchDelay, 200);

      bundle = new Bundle({
        watchDelay: 300
      });
      assert.equal(bundle.opts.watchDelay, 300);
    });
    it('is passed to the watcher', function(done) {
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
    it('defaults to false', function() {
      var bundle = new Bundle();
      assert.isFalse(bundle.opts.watch);

      bundle = new Bundle({
        watch: true
      });
      assert.isTrue(bundle.opts.watch);
    });
    it('can cause file changes to be detected and cause bundle rebuilds', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'watch_source', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'watch_source', 'output.js');

      var bundle = new Bundle({watch: true}, {
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
        fs.writeFileSync(entry, 'module.exports = "__WATCH_TEST_TWO__";');
        setTimeout(function() {
          bundle.onceDone(function(err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
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
            }, 200);
          });
        }, 200);
      });
    });
  });
  describe('#opts.cache', function() {
    it('defaults to false', function() {
      var bundle = new Bundle();
      assert.isFalse(bundle.opts.cache);

      bundle = new Bundle({
        cache: true
      });
      assert.isTrue(bundle.opts.cache);
    });
    it('if false, the compiler is not preserved', function(done) {
      var bundle = new Bundle({}, {});
      bundle.getCompiler(function(err, compiler) {
        assert.isNull(err);
        assert.isObject(compiler);
        assert.isNull(bundle.compiler);
        bundle.getCompiler(function(err, _compiler) {
          assert.isNull(err);
          assert.isObject(_compiler);
          assert.notStrictEqual(_compiler, compiler);
          assert.isNull(bundle.compiler);
          done();
        });
      });
    });
    it('if true, the compiler is preserved', function(done) {
      var bundle = new Bundle({
        cache: true
      }, {});
      bundle.getCompiler(function(err, compiler) {
        assert.isNull(err);
        assert.isObject(compiler);
        assert.strictEqual(bundle.compiler, compiler);
        bundle.getCompiler(function(err, _compiler) {
          assert.isNull(err);
          assert.isObject(_compiler);
          assert.strictEqual(_compiler, compiler);
          assert.strictEqual(bundle.compiler, _compiler);
          done();
        });
      });
    });
    it('if true, the compiler can be invalidated', function(done) {
      var bundle = new Bundle({
        cache: true
      }, {});
      bundle.getCompiler(function(err, compiler) {
        assert.isNull(err);
        assert.isObject(compiler);
        assert.strictEqual(bundle.compiler, compiler);
        bundle.invalidate();
        assert.isNull(bundle.compiler);
        done();
      });
    });
    it('if false, errors and stats are not preserved from the compilation', function(done) {
      var bundle = new Bundle({}, require('./test_bundles/basic_bundle/webpack.config'));
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.isNull(bundle.err);
        assert.isNull(bundle.stats);
        bundle.onceDone(function(_err, _stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.notStrictEqual(_stats, stats);
          assert.isNull(bundle.err);
          assert.isNull(bundle.stats);
          done();
        });
      });
    });
    it('if true, errors and stats are preserved from the compilation', function(done) {
      var bundle = new Bundle({
        cache: true
      }, require('./test_bundles/basic_bundle/webpack.config'));
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.isNull(bundle.err);
        assert.strictEqual(bundle.stats, stats);
        bundle.onceDone(function(_err, _stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.strictEqual(_stats, stats);
          assert.isNull(bundle.err);
          assert.strictEqual(bundle.stats, _stats);
          done();
        });
      });
    });
    it('if true, the errors and stats can be invalidated', function(done) {
      var bundle = new Bundle({
        cache: true
      }, require('./test_bundles/basic_bundle/webpack.config'));
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        bundle.invalidate();
        assert.isNull(bundle.err);
        assert.isNull(bundle.stats);
        done();
      });
    });
    it('if false, bundles are rebuilt when onceDone is called', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'uncached_bundles', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'uncached_bundles', 'output.js');

      var bundle = new Bundle({}, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));

      fs.writeFileSync(entry, 'module.exports = "__UNCACHED_TEST_ONE__";');
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__UNCACHED_TEST_ONE__');
        fs.writeFileSync(entry, 'module.exports = "__UNCACHED_TEST_TWO__";');
        bundle.onceDone(function(err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__UNCACHED_TEST_TWO__');
          fs.writeFileSync(entry, 'module.exports = "__UNCACHED_TEST_THREE__";');
          bundle.onceDone(function(err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.pathsToAssets['output.js']);
            contents = fs.readFileSync(output);
            assert.include(contents.toString(), '__UNCACHED_TEST_THREE__');
            done();
          });
        });
      });
    });
    it('if true, bundles are not rebuilt when onceDone is called', function(done) {
      var entry = path.join(TEST_OUTPUT_DIR, 'cached_bundles', 'entry.js');
      var output = path.join(TEST_OUTPUT_DIR, 'cached_bundles', 'output.js');

      var bundle = new Bundle({
        cache: true
      }, {
        context: path.dirname(entry),
        entry: './' + path.basename(entry),
        output: {
          path: path.dirname(output),
          filename: path.basename(output)
        }
      });

      mkdirp.sync(path.dirname(entry));

      fs.writeFileSync(entry, 'module.exports = "__CACHED_TEST_ONE__";');
      bundle.onceDone(function(err, stats) {
        assert.isNull(err);
        assert.isObject(stats);
        assert.equal(output, stats.pathsToAssets['output.js']);
        var contents = fs.readFileSync(output);
        assert.include(contents.toString(), '__CACHED_TEST_ONE__');
        fs.writeFileSync(entry, 'module.exports = "__CACHED_TEST_TWO__";');
        bundle.onceDone(function(err, stats) {
          assert.isNull(err);
          assert.isObject(stats);
          assert.equal(output, stats.pathsToAssets['output.js']);
          contents = fs.readFileSync(output);
          assert.include(contents.toString(), '__CACHED_TEST_ONE__');
          assert.notInclude(contents.toString(), '__CACHED_TEST_TWO__');
          fs.writeFileSync(entry, 'module.exports = "__CACHED_TEST_THREE__";');
          bundle.onceDone(function(err, stats) {
            assert.isNull(err);
            assert.isObject(stats);
            assert.equal(output, stats.pathsToAssets['output.js']);
            contents = fs.readFileSync(output);
            assert.include(contents.toString(), '__CACHED_TEST_ONE__');
            assert.notInclude(contents.toString(), '__CACHED_TEST_TWO__');
            assert.notInclude(contents.toString(), '__CACHED_TEST_THREE__');
            done();
          });
        });
      });
    });
  });
  describe('#opts.bundleDir', function() {
    it('defaults to null', function() {
      var bundle = new Bundle();
      assert.isNull(bundle.opts.bundleDir);

      bundle = new Bundle({
        bundleDir: '/foo/bar'
      });
      assert.equal(bundle.opts.bundleDir, '/foo/bar');
    });
    it('can replace [bundle_dir] tokens in a config\'s output path', function(done) {
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