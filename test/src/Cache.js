import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import Cache from '../../lib/caches/Cache';
import options from '../../lib/options';
import utils from './utils';
import webpackPackageJson from 'webpack/package';
import packageJson from '../../package';

let assert = utils.assert;
let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  utils.cleanTestOutputDir();
});
afterEach(() => {
  utils.cleanTestOutputDir();
});

describe('Cache', () => {
  it('should be a function', () => {
    assert.isFunction(Cache);
  });
  it('should accept a filename argument', () => {
    let filename = path.join(TEST_OUTPUT_DIR, 'cache_init_test.json');
    let cache = new Cache(options({cacheFile: filename}));
    assert.equal(cache.filename, filename);
    assert.deepEqual(cache.data, {});
    cache.set(null);
    assert.equal(fs.readFileSync(filename).toString(), 'null');
  });
  it('should be able to persist an entry to a file', () => {
    let cache = new Cache(
      options({cacheFile: path.join(TEST_OUTPUT_DIR, 'cache_persist.json')})
    );
    cache.set({foo: {bar: 'woz'}});
    let json = require(TEST_OUTPUT_DIR + '/cache_persist.json');
    assert.deepEqual(json, {foo: {bar: 'woz'}});
  });
  it('should be able to read an entry from a file', () => {
    let filename = path.join(TEST_OUTPUT_DIR, 'cache_read.json');
    let testFile = path.join(TEST_OUTPUT_DIR, 'cache_read_test_file.js');
    let startTime = +new Date() + 2000;

    mkdirp.sync(path.dirname(filename));

    fs.writeFileSync(filename, JSON.stringify({
      startTime: startTime,
      fileDependencies: [filename],
      stats: {test: 'bar'},
      config: {
        file: '/foo/bar'
      }
    }));

    fs.writeFileSync(testFile, '{}');

    let cache = new Cache(options({cacheFile: filename}), true);

    assert.equal(cache.filename, filename);
    assert.isObject(cache.data);
    assert.equal(cache.data.startTime, startTime);
    assert.deepEqual(cache.data.fileDependencies, [filename]);
    assert.deepEqual(cache.data.stats, {test: 'bar'});
    assert.equal(cache.data.config.file, '/foo/bar');
  });
  describe('#get', () => {
    it('should validate an entry\'s props', (done) => {
      let filename = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate.json');
      let testFile = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate_test_file.js');

      let startTime = +new Date();

      mkdirp.sync(path.dirname(filename));

      fs.writeFileSync(filename, '{}');
      fs.writeFileSync(testFile, '{}');

      let cache = new Cache(options({cacheFile: filename}));

      cache.get((err, entry) => {
        assert.isNull(err);
        assert.isNull(entry);

        cache.data = {
          startTime: startTime,
          fileDependencies: [],
          stats: {},
          config: {
            file: testFile
          },
          buildHash: 'foo',
          assets: [],
          dependencies: {
            webpack: webpackPackageJson.version,
            'webpack-build': null
          }
        };

        cache.get((err, entry) => {
          assert.isNull(err);
          assert.isNull(entry);

          cache.data.dependencies = {
            webpack: webpackPackageJson.version,
            'webpack-build': packageJson.version
          };

          cache.get((err, entry) => {
            assert.isNull(err);
            assert.isObject(entry);

            assert.strictEqual(entry, cache.data);

            done();
          });
        });
      });
    });
    it('should validate a config file\'s mtime', (done) => {
      let filename1 = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime1.json');
      let filename2 = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime2.json');
      let testFile = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime_test_file.js');

      mkdirp.sync(path.dirname(filename1));

      fs.writeFileSync(filename1, JSON.stringify({
        startTime: +new Date() - 1000,
        fileDependencies: [filename1],
        dependencies: {},
        stats: {test: 1},
        config: {
          file: testFile
        },
        buildHash: 'foo1',
        assets: []
      }));

      fs.writeFileSync(filename2, JSON.stringify({
        startTime: +new Date() + 1000,
        fileDependencies: [filename2],
        dependencies: {},
        stats: {test: 2},
        config: {
          file: testFile
        },
        buildHash: 'foo2',
        assets: []
      }));

      fs.writeFileSync(testFile, '{}');

      let cache1 = new Cache(options({cacheFile: filename1}));
      let cache2 = new Cache(options({cacheFile: filename2}));

      cache1.get((err, entry) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Stale config file');
        assert.isUndefined(entry);

        cache2.get((err, entry) => {
          assert.isNull(err);
          assert.isObject(entry);

          assert.strictEqual(entry, cache2.data);
          assert.equal(entry.stats.test, 2);

          done();
        });
      });
    });
  });
  describe('#set', () => {
    it('should persist to file', () => {
      let filename = path.join(TEST_OUTPUT_DIR, 'cache_set.json');
      mkdirp.sync(path.dirname(filename));

      let cache = new Cache(options({cacheFile: filename}));

      cache.set({foo: {bar: 'woz'}});

      let contents = fs.readFileSync(filename).toString();

      assert.deepEqual(JSON.parse(contents), {foo: {bar: 'woz'}});
    });
  })
});