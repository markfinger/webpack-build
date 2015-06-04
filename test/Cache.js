'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Cache = require('../lib/Cache');
var options = require('../lib/options');
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

describe('Cache', function() {
  it('should be a function', function() {
    assert.isFunction(Cache);
  });
  it('should accept a filename argument', function() {
    var filename = path.join(TEST_OUTPUT_DIR, 'cache_init_test.json');
    var cache = new Cache(options.generate({cacheFile: filename}));
    assert.equal(cache.filename, filename);
    assert.deepEqual(cache.data, {});
    assert.equal(fs.readFileSync(filename).toString(), '{}');
  });
  it('should be able to persist an entry to a file', function() {
    var cache = new Cache(
      options.generate({cacheFile: path.join(TEST_OUTPUT_DIR, 'cache_persist.json')})
    );
    cache.set({foo: {bar: 'woz'}});
    var json = require(TEST_OUTPUT_DIR + '/cache_persist.json');
    assert.deepEqual(json, {foo: {bar: 'woz'}});
  });
  it('should be able to read an entry from a file', function() {
    var filename = path.join(TEST_OUTPUT_DIR, 'cache_read.json');
    var testFile = path.join(TEST_OUTPUT_DIR, 'cache_read_test_file.js');
    var startTime = +new Date() + 2000;

    mkdirp.sync(path.dirname(filename));

    fs.writeFileSync(filename, JSON.stringify({
      startTime: startTime,
      fileDependencies: [filename],
      stats: {test: 'bar'},
      config: '/foo/bar'
    }));

    fs.writeFileSync(testFile, '{}');

    var cache = new Cache(options.generate({cacheFile: filename}), true);

    assert.equal(cache.filename, filename);
    assert.isObject(cache.data);
    assert.equal(cache.data.startTime, startTime);
    assert.deepEqual(cache.data.fileDependencies, [filename]);
    assert.deepEqual(cache.data.stats, {test: 'bar'});
    assert.equal(cache.data.config, '/foo/bar');
  });
  describe('#get', function() {
    it('should validate an entry\'s props', function(done) {
      var filename = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate.json');
      var testFile = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate_test_file.js');

      var startTime = +new Date();

      mkdirp.sync(path.dirname(filename));

      fs.writeFileSync(filename, '{}');
      fs.writeFileSync(testFile, '{}');

      var cache = new Cache(options.generate({cacheFile: filename}));

      cache.get(function(err, entry) {
        assert.isNull(err);
        assert.isNull(entry);

        cache.data = {};
        cache.get(function(err, entry) {
          assert.isNull(err);
          assert.isNull(entry);

          cache.data.startTime = startTime;
          cache.get(function(err, entry) {
            assert.isNull(err);
            assert.isNull(entry);

            cache.data.fileDependencies = [];
            cache.get(function(err, entry) {
              assert.isNull(err);
              assert.isNull(entry);

              cache.data.stats = {};
              cache.get(function(err, entry) {
                assert.isNull(err);
                assert.isNull(entry);

                cache.data.config = testFile;
                cache.get(function(err, entry) {
                  assert.isNull(err);
                  assert.isNull(entry);

                  cache.data.hash = 'foo';
                  cache.get(function(err, entry) {
                    assert.isNull(err);
                    assert.isObject(entry);

                    assert.strictEqual(entry, cache.data);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    it('should validate a config file\'s mtime', function(done) {
      var filename1 = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime1.json');
      var filename2 = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime2.json');
      var testFile = path.join(TEST_OUTPUT_DIR, 'cache_file_mtime_test_file.js');

      mkdirp.sync(path.dirname(filename1));

      fs.writeFileSync(filename1, JSON.stringify({
        startTime: +new Date() - 1000,
        fileDependencies: [filename1],
        stats: {test: 1},
        config: testFile,
        hash: 'foo1'
      }));

      fs.writeFileSync(filename2, JSON.stringify({
        startTime: +new Date() + 1000,
        fileDependencies: [filename2],
        stats: {test: 2},
        config: testFile,
        hash: 'foo2'
      }));

      fs.writeFileSync(testFile, '{}');

      var cache1 = new Cache(options.generate({cacheFile: filename1}));
      var cache2 = new Cache(options.generate({cacheFile: filename2}));

      cache1.get(function(err, entry) {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Stale config file');
        assert.isUndefined(entry);

        cache2.get(function(err, entry) {
          assert.isNull(err);
          assert.isObject(entry);

          assert.strictEqual(entry, cache2.data);
          assert.equal(entry.stats.test, 2);

          done();
        });
      });
    });
  });
  describe('#set', function() {
    it('should persist to file', function() {
      var filename = path.join(TEST_OUTPUT_DIR, 'cache_set.json');
      mkdirp.sync(path.dirname(filename));

      var cache = new Cache(options.generate({cacheFile: filename}));

      cache.set({foo: {bar: 'woz'}});

      var contents = fs.readFileSync(filename).toString();

      assert.deepEqual(JSON.parse(contents), {foo: {bar: 'woz'}});
    });
  })
});