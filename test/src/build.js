import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import build from '../../lib/index';
import Wrapper from '../../lib/wrappers/Wrapper';
import wrappers from '../../lib/wrappers'
import cache from '../../lib/cache';
import utils from './utils';

let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;
let assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  wrappers.clear();
  cache.clear();
  utils.cleanTestOutputDir();
});
afterEach(() => {
  wrappers.clear();
  cache.clear();
  utils.cleanTestOutputDir();
});

describe('build', () => {
  it('should be a function', () => {
    assert.isFunction(build);
  });
  it('should accept options and callback arguments', () => {
    let opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    };
    build(opts, () => {});
  });
  it('should populate the bundle list', () => {
    let pathToConfig = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config');
    let opts1 = {
      config: pathToConfig,
      watch: true
    };
    assert.equal(Object.keys(wrappers.wrappers).length, 0);

    let wrapper1 = build(opts1, () => {});
    assert.equal(Object.keys(wrappers.wrappers).length, 1);
    assert.strictEqual(wrappers.wrappers[opts1.buildHash], wrapper1);
    assert.strictEqual(wrappers.wrappers[opts1.buildHash].opts, opts1);

    let opts2 = {
      config: pathToConfig,
      watch: true
    };
    let wrapper2 = build(opts2, () => {});
    assert.strictEqual(wrapper2, wrapper1);
    assert.equal(Object.keys(wrappers.wrappers).length, 1);
    assert.strictEqual(wrappers.wrappers[opts2.buildHash], wrapper2);
    assert.strictEqual(wrappers.wrappers[opts2.buildHash].opts, opts1);

    let opts3 = {
      config: pathToConfig,
      watch: false
    };
    let wrapper3 = build(opts3, () => {});
    assert.equal(Object.keys(wrappers.wrappers).length, 2);
    assert.strictEqual(wrappers.wrappers[opts3.buildHash], wrapper3);
    assert.strictEqual(wrappers.wrappers[opts3.buildHash].opts, opts3);

    let opts4 = {
      config: pathToConfig + 'test',
      watch: false
    };
    let wrapper4 = build(opts4, () => {});
    assert.equal(Object.keys(wrappers.wrappers).length, 3);
    assert.strictEqual(wrappers.wrappers[opts4.buildHash], wrapper4);
    assert.strictEqual(wrappers.wrappers[opts4.buildHash].opts, opts4);

    let opts5 = {
      config: pathToConfig + 'test',
      watch: false
    };
    build(opts5, () => {});
    assert.equal(Object.keys(wrappers.wrappers).length, 3);

    let opts6 = {
      config: pathToConfig,
      watch: true
    };
    build(opts6, () => {});
    assert.equal(Object.keys(wrappers.wrappers).length, 3);
  });
  it('should be able to generate a bundle', (done) => {
    build({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config')
    }, (err, data) => {
      assert.isNull(err);
      assert.isObject(data);

      assert.isArray(data.assets);
      assert.isObject(data.webpackConfig);

      let existsAt = data.assets[0];
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
      let cacheFile = path.join(TEST_OUTPUT_DIR, 'test_cacheFile.json');
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
        buildHash: 'foo'
      }));

      build({
        config: configFile,
        cacheFile: cacheFile,
        buildHash: 'foo'
      }, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        assert.deepEqual(data.stats, {test: {foo: 'bar'}});
        done();
      });
    });
    it('should generate a cache file in the cache dir', (done) => {
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      let opts = {
        config: configFile
      };

      build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        assert.isString(opts.cacheFile);
        assert.include(opts.cacheFile, opts.cacheDir);

        done();
      });
    });
    it('should generate a cache file from the config file and options hash', (done) => {
      let configFile = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');

      let opts = {
        config: configFile,
        watch: false
      };

      let wrapper = build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        assert.strictEqual(wrapper.opts, opts);

        cache.get(opts, (_err, _data) => {
          assert.isNull(_err);
          assert.deepEqual(_data, data);

          assert.isString(opts.config);
          assert.isString(opts.buildHash);
          assert.equal(opts.cacheFile, path.join(opts.cacheDir, opts.buildHash + '.json'));

          assert.equal(cache._caches.get(opts).filename, opts.cacheFile);

          done();
        });
      });
    });
    it('should stop serving cached data once a watcher has completed', (done) => {
      let cacheFile = path.join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
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
        buildHash: 'foo'
      }));

      let opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        buildHash: 'foo'
      };

      let wrapper = build(opts, (err, data1) => {
        assert.isNull(err);
        assert.isObject(data1);
        assert.deepEqual(data1.stats, {test: {foo: 'bar'}});

        assert.strictEqual(wrapper.opts.cacheFile, cacheFile);

        let _cache = cache._caches.get(opts);
        assert.deepEqual(data1.stats, _cache.data.stats);
        assert.isFalse(_cache.delegate);

        build(opts, (err, data2) => {
          assert.isNull(err);
          assert.isObject(data2);

          assert.strictEqual(data2, data1);
          assert.deepEqual(data2.stats, {test: {foo: 'bar'}});
          assert.isFalse(_cache.delegate);

          setTimeout(() => {
            wrapper.onceDone((err, data3) => {
              assert.isNull(err);
              assert.isObject(data3);
              assert.notStrictEqual(data3, data2);

              assert.isString(_cache.data.buildHash);
              assert.equal(_cache.data.buildHash, opts.buildHash);
              assert.equal(_cache.data.buildHash, wrapper.opts.buildHash);

              assert.isTrue(_cache.delegate);

              build(opts, (err, data4) => {
                assert.isNull(err);
                assert.isObject(data4);
                assert.deepEqual(data4.stats, data3.stats);

                done();
              });
            });
          }, 50);
        });
      });
    });
  });
});