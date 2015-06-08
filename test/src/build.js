import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import build from '../../lib/index';
import Wrapper from '../../lib/Wrapper';
import utils from './utils';

let assert = utils.assert;
let CACHE_DIR = path.join(utils.TEST_OUTPUT_DIR, 'cache_dir');

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  build.wrappers.clear();
  build.caches.clear();
  utils.cleanTestOutputDir();
});
afterEach(() => {
  build.wrappers.clear();
  build.caches.clear();
  utils.cleanTestOutputDir();
});

describe('build', () => {
  it('should be a function', () => {
    assert.isFunction(build);
  });
  it('should accept options and callback arguments', () => {
    let opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts, () => {});
  });
  it('should populate the bundle list', () => {
    let pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    let opts1 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    assert.equal(Object.keys(build.wrappers.wrappers).length, 0);

    let wrapper1 = build(opts1, () => {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 1);
    assert.strictEqual(build.wrappers.wrappers[opts1.hash], wrapper1);
    assert.strictEqual(build.wrappers.wrappers[opts1.hash].opts, opts1);

    let opts2 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    let wrapper2 = build(opts2, () => {});
    assert.strictEqual(wrapper2, wrapper1);
    assert.equal(Object.keys(build.wrappers.wrappers).length, 1);
    assert.strictEqual(build.wrappers.wrappers[opts2.hash], wrapper2);
    assert.strictEqual(build.wrappers.wrappers[opts2.hash].opts, opts1);

    let opts3 = {
      config: pathToConfig,
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    let wrapper3 = build(opts3, () => {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 2);
    assert.strictEqual(build.wrappers.wrappers[opts3.hash], wrapper3);
    assert.strictEqual(build.wrappers.wrappers[opts3.hash].opts, opts3);

    let opts4 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    let wrapper4 = build(opts4, () => {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);
    assert.strictEqual(build.wrappers.wrappers[opts4.hash], wrapper4);
    assert.strictEqual(build.wrappers.wrappers[opts4.hash].opts, opts4);

    let opts5 = {
      config: pathToConfig + 'test',
      watch: false,
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts5, () => {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);

    let opts6 = {
      config: pathToConfig,
      watch: true,
      logger: null,
      cacheDir: CACHE_DIR
    };
    build(opts6, () => {});
    assert.equal(Object.keys(build.wrappers.wrappers).length, 3);
  });
  it('should be able to generate a bundle', (done) => {
    build({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config'),
      logger: null,
      cacheDir: CACHE_DIR
    }, (err, stats) => {
      assert.isNull(err);
      assert.isObject(stats);

      assert.isObject(stats.pathsToAssets);
      assert.isObject(stats.webpackConfig);

      let existsAt = stats.pathsToAssets['output.js'];
      assert.isString(existsAt);

      fs.readFile(existsAt, (err, contents) => {
        assert.isNull(err);
        let compiledBundle = contents.toString();
        assert.include(compiledBundle, '__BASIC_BUNDLE_ENTRY_TEST__');
        assert.include(compiledBundle, '__BASIC_BUNDLE_REQUIRE_TEST__');
        done();
      });
    });
  });
  describe('file cache', () => {
    it('should respect the cacheDir and cacheFile options', (done) => {
      let cacheFile = path.join(CACHE_DIR, 'test_cacheFile.json');
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: {foo: 'bar'}
        },
        config: configFile,
        hash: 'foo'
      }));

      build({
        config: configFile,
        cacheFile: cacheFile,
        logger: null,
        hash: 'foo'
      }, (err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        assert.deepEqual(stats, {test: {foo: 'bar'}});
        done();
      });
    });
    it('should generate a cache file in the cache dir', (done) => {
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      let opts = {
        config: configFile,
        cacheDir: CACHE_DIR,
        logger: null
      };

      build(opts, (err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        assert.isString(opts.cacheFile);
        assert.include(opts.cacheFile, opts.cacheDir);

        done();
      });
    });
    it('should generate a cache file from the config file and options hash', (done) => {
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      let opts = {
        config: configFile,
        cacheDir: CACHE_DIR,
        logger: null
      };

      let wrapper = build(opts, (err, stats) => {
        assert.isNull(err);
        assert.isObject(stats);

        assert.strictEqual(wrapper.opts, opts);

        let cache = build.caches.get(opts);

        assert.isString(opts.config);
        assert.isString(opts.hash);
        assert.equal(opts.cacheFile, path.join(CACHE_DIR, opts.hash + '.json'));

        assert.equal(cache.filename, opts.cacheFile);

        done();
      });
    });
    it('should stop serving cached data once a watcher has completed', (done) => {
      let cacheFile = path.join(CACHE_DIR, 'test_cache_stops_once_watcher_done.json');
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      mkdirp.sync(path.dirname(cacheFile));

      fs.writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: {foo: 'bar'}
        },
        config: configFile,
        hash: 'foo'
      }));

      let opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        logger: null,
        hash: 'foo'
      };

      let wrapper = build(opts, (err, stats1) => {
        assert.isNull(err);
        assert.isObject(stats1);
        assert.deepEqual(stats1, {test: {foo: 'bar'}});

        assert.strictEqual(wrapper.opts.cacheFile, cacheFile);

        let cache = build.caches.get(opts);
        assert.strictEqual(wrapper.cache, cache);
        assert.strictEqual(stats1, cache.data.stats);
        assert.isFalse(cache.delegate);

        build(opts, (err, stats2) => {
          assert.isNull(err);
          assert.isObject(stats2);

          assert.strictEqual(stats2, stats1);
          assert.deepEqual(stats2, {test: {foo: 'bar'}});
          assert.isFalse(cache.delegate);

          setTimeout(() => {
            wrapper.onceDone((err, stats3) => {
              assert.isNull(err);
              assert.isObject(stats3);
              assert.notStrictEqual(stats3, stats2);

              assert.isString(cache.data.hash);
              assert.equal(cache.data.hash, opts.hash);
              assert.equal(cache.data.hash, wrapper.opts.hash);

              assert.isTrue(cache.delegate);

              build(opts, (err, stats4) => {
                assert.isNull(err);
                assert.isObject(stats4);
                assert.deepEqual(stats4, stats3);

                done();
              });
            });
          }, 50);
        });
      });
    });
  });
});