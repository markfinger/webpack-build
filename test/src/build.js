import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import build from '../../lib';
import Wrapper from '../../lib/wrappers/Wrapper';
import wrappers from '../../lib/wrappers';
import workers from '../../lib/workers';
import caches from '../../lib/caches';
import utils from './utils';

let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;
let assert = utils.assert;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  wrappers.clear();
  caches.clear();
  workers.killAll();
  utils.cleanTestOutputDir();
});
afterEach(() => {
  wrappers.clear();
  caches.clear();
  workers.killAll();
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
  it('should populate the wrappers list', (done) => {
    let basicBundle = path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js');
    let libraryBundle = path.join(__dirname, 'test_bundles', 'library_bundle', 'webpack.config.js');

    let opts1 = {
      config: basicBundle
    };
    assert.equal(Object.keys(wrappers.wrappers).length, 0);

    build(opts1, () => {});

    _.defer(() => {
      assert.equal(Object.keys(wrappers.wrappers).length, 1);
      assert.strictEqual(wrappers.wrappers[opts1.buildHash].opts, opts1);

      let opts2 = {
        config: basicBundle
      };
      build(opts2, () => {});

      _.defer(() => {
        assert.strictEqual(wrappers.wrappers[opts2.buildHash], wrappers.wrappers[opts1.buildHash]);
        assert.equal(Object.keys(wrappers.wrappers).length, 1);
        assert.strictEqual(wrappers.wrappers[opts2.buildHash].opts, opts1);

        let opts3 = {
          config: libraryBundle
        };
        build(opts3, () => {});

        _.defer(() => {
          assert.equal(Object.keys(wrappers.wrappers).length, 2);
          assert.strictEqual(wrappers.wrappers[opts3.buildHash].opts, opts3);

          let opts4 = {
            config: basicBundle
          };
          build(opts4, () => {});

          _.defer(() => {
            assert.equal(Object.keys(wrappers.wrappers).length, 2);
            assert.deepEqual(wrappers.wrappers[opts4.buildHash].opts, opts4);

            done();
          });
        });
      });
    });
  });
  it('should be able to generate a bundle', (done) => {
    build({
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    }, (err, data) => {
      assert.isNull(err);
      assert.isObject(data);

      assert.isArray(data.assets);
      assert.isObject(data.outputOptions);

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
  it('should check mtimes to detect stale config files', (done) => {
    let configFile = path.join(TEST_OUTPUT_DIR, 'stale_config_file.js');

    mkdirp.sync(path.dirname(configFile));
    fs.writeFileSync(configFile, 'module.exports = function(){ return {}; }');
    let initialMTime = +fs.statSync(configFile).mtime;

    build({
      config: configFile
    }, (err, data) => {
      assert.isNull(err);
      assert.isObject(data);

      // Need to delay due to file system accuracy issues
      setTimeout(function() {
        fs.writeFileSync(configFile, 'module.exports = {test: 1}');
        assert.notEqual(+fs.statSync(configFile).mtime, initialMTime);

        build({
          config: configFile
        }, (err, data) => {
          assert.instanceOf(err, Error);
          done();
        });
      }, 1000);
    });
  });
  it('should indicate if a config file does not exist', (done) => {
    let configFile = path.join(TEST_OUTPUT_DIR, 'non_existent_config_file.js');

    assert.throws(() => {
      fs.statSync(configFile);
    });

    build({
      config: configFile
    }, (err, data) => {
      assert.instanceOf(err, Error);
      assert.isNull(data);

      assert.include(err.message, `Cannot find config file ${configFile}`);

      done();
    });
  });
  it('should indicate if importing a config file produced errors', (done) => {
    let configFile = path.join(TEST_OUTPUT_DIR, 'broken_config_file.js');

    mkdirp.sync(path.dirname(configFile));
    fs.writeFileSync(configFile, 'require("package-that-does-not-exist");');

    build({
      config: configFile
    }, (err, data) => {
      assert.instanceOf(err, Error);
      assert.isNull(data);

      assert.include(err.message, `Failed to import config file ${configFile}`);

      done();
    });
  });
  it('should expose the default options', () => {
    assert.isFunction(build.options);
    assert.isObject(build.options.defaults);
    assert.isObject(build.options.defaults);
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
        config: {
          file: configFile
        },
        buildHash: 'foo',
        assets: []
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
        config: configFile
      };

      build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        assert.strictEqual(wrappers.wrappers[opts.buildHash].opts, opts);

        caches.get(opts, (_err, _data) => {
          assert.isNull(_err);
          assert.deepEqual(_data, data);

          assert.isString(opts.config);
          assert.isString(opts.buildHash);
          assert.equal(opts.cacheFile, path.join(opts.cacheDir, opts.buildHash + '.json'));

          assert.equal(caches._caches.get(opts).filename, opts.cacheFile);

          done();
        });
      });
    });
    it('should stop serving cached data once a watcher has completed', (done) => {
      let cacheFile = path.join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.json');
      let configFile = path.join(TEST_OUTPUT_DIR, 'test_cache_stops_once_watcher_done.js');

      mkdirp.sync(TEST_OUTPUT_DIR);

      fs.writeFileSync(cacheFile, JSON.stringify({
        startTime: +new Date() + 2000,
        fileDependencies: [],
        dependencies: [],
        stats: {
          test: {foo: 'bar'}
        },
        config: {
          file: configFile
        },
        buildHash: 'foo',
        assets: []
      }));

      fs.writeFileSync(configFile, `
        module.exports = require('${path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')}');
      `);

      let opts = {
        config: configFile,
        cacheFile: cacheFile,
        watch: true,
        buildHash: 'foo'
      };

      build(opts, (err1, data1) => {
        assert.isNull(err1);
        assert.isObject(data1);
        assert.deepEqual(data1.stats, {test: {foo: 'bar'}});

        let cache = caches._caches.get(opts);
        assert.deepEqual(data1.stats, cache.data.stats);
        assert.isFalse(cache.delegate);

        build(opts, (err2, data2) => {
          assert.isNull(err2);
          assert.isObject(data2);

          assert.strictEqual(data2, data1);
          assert.deepEqual(data2.stats, {test: {foo: 'bar'}});
          assert.isFalse(cache.delegate);

          setTimeout(() => {
            let wrapper = wrappers.wrappers[opts.buildHash];

            wrapper.onceDone((err, data3) => {
              assert.isNull(err);
              assert.isObject(data3);
              assert.notStrictEqual(data3, data2);

              assert.isString(cache.data.buildHash);
              assert.equal(cache.data.buildHash, opts.buildHash);
              assert.equal(cache.data.buildHash, wrapper.opts.buildHash);

              assert.isTrue(cache.delegate);

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
  describe('workers', () => {
    it('should expose the workers', () => {
      assert.strictEqual(build.workers, workers);
    });
    it('should be used if they are available', (done) => {
      build.workers.spawn(2);

      assert.isTrue(build.workers.available());

      let opts = {
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      assert.equal(Object.keys(wrappers.wrappers).length, 0);
      assert.equal(Object.keys(workers.matches).length, 0);
      assert.isUndefined(workers.match(opts));

      build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        assert.equal(Object.keys(wrappers.wrappers).length, 0);
        assert.equal(Object.keys(workers.matches).length, 1);
        assert.equal(workers.matches[opts.buildHash], workers.workers[0].id);
        assert.strictEqual(workers.match(opts), workers.workers[0]);

        build(opts, (_err, _data) => {
          assert.isNull(_err);
          assert.isObject(_data);

          assert.equal(Object.keys(wrappers.wrappers).length, 0);
          assert.equal(Object.keys(workers.matches).length, 1);
          assert.equal(workers.matches[opts.buildHash], workers.workers[0].id);
          assert.strictEqual(workers.match(opts), workers.workers[0]);

          assert.deepEqual(_data, data);

          done();
        });
      });
    });
    it('should populate the cache via signals', (done) => {
      build.workers.spawn();

      assert.isTrue(build.workers.available());

      let opts = {
        config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      build(opts, (err, data) => {
        assert.isNull(err);
        assert.isObject(data);

        setTimeout(() => {
          assert.equal(Object.keys(wrappers.wrappers).length, 0);
          let cache = caches._caches.get(opts);
          assert.deepEqual(data, cache.data);

          done();
        }, 50);
      });
    });
  });
});