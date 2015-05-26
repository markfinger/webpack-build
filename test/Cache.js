'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Cache = require('../lib/Cache');
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
    var cache = new Cache(filename);
    assert.equal(cache.filename, filename);
    assert.deepEqual(cache.data, {});
    assert.equal(fs.readFileSync(filename).toString(), '{}');
  });
  it('should be able to persist an entry to a file', function() {
    var cache = new Cache(path.join(TEST_OUTPUT_DIR, 'cache_persist.json'));
    cache.set('foo', {bar: 'woz'});
    var json = require(TEST_OUTPUT_DIR + '/cache_persist.json');
    assert.deepEqual(json, {foo: {bar: 'woz'}});
  });
  it('should be able to read an entry from a file', function() {
    var filename = path.join(TEST_OUTPUT_DIR, 'cache_read.json');
    var testFile = path.join(TEST_OUTPUT_DIR, 'cache_read_test_file.js');
    var startTime = +new Date() + 2000;

    mkdirp.sync(path.dirname(filename));

    var obj = {};
    obj[testFile] = {
      startTime: startTime,
      fileDependencies: [filename],
      stats: {test: 'bar'},
      config: '/foo/bar'
    };

    fs.writeFileSync(filename, JSON.stringify(obj));
    fs.writeFileSync(testFile, '{}');

    var cache = new Cache(filename);

    var entry = cache.data[testFile];

    assert.equal(entry.startTime, startTime);
    assert.deepEqual(entry.fileDependencies, [filename]);
    assert.deepEqual(entry.stats, {test: 'bar'});
    assert.equal(entry.config, '/foo/bar');
  });
  describe('#get', function() {
    it('should validate an entry\'s props', function(done) {
      var filename = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate.json');
      var testFile = path.join(TEST_OUTPUT_DIR, 'cache_prop_validate_test_file.js');

      var startTime = +new Date();

      mkdirp.sync(path.dirname(filename));

      fs.writeFileSync(filename, '{}');
      fs.writeFileSync(testFile, '{}');

      var cache = new Cache(filename);

      cache.get('test', function(err, entry) {
        assert.isNull(err);
        assert.isNull(entry);

        cache.data['test'] = {};
        cache.get('test', function(err, entry) {
          assert.isNull(err);
          assert.isNull(entry);

          cache.data['test'].startTime = startTime;
          cache.get('test', function(err, entry) {
            assert.isNull(err);
            assert.isNull(entry);

            cache.data['test'].fileDependencies = [];
            cache.get('test', function(err, entry) {
              assert.isNull(err);
              assert.isNull(entry);

              cache.data['test'].stats = {};
              cache.get('test', function(err, entry) {
                assert.isNull(err);
                assert.isNull(entry);

                cache.data['test'].config = testFile;
                cache.get('test', function(err, entry) {
                  assert.isNull(err);
                  assert.isObject(entry);

                  assert.strictEqual(entry, cache.data['test']);

                  done();
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
        test1: {
          startTime: +new Date() - 1000,
          fileDependencies: [filename1],
          stats: {test: 1},
          config: testFile
        }
      }));

      fs.writeFileSync(filename2, JSON.stringify({
        test2: {
          startTime: +new Date() + 1000,
          fileDependencies: [filename2],
          stats: {test: 2},
          config: testFile
        }
      }));

      fs.writeFileSync(testFile, '{}');

      var cache1 = new Cache(filename1);
      var cache2 = new Cache(filename2);

      cache1.get('test1', function(err, entry) {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Stale config file');
        assert.isUndefined(entry);

        cache2.get('test2', function(err, entry) {
          assert.isNull(err);
          assert.isObject(entry);

          assert.strictEqual(entry, cache2.data['test2']);
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

      var cache = new Cache(filename);

      cache.set('foo', {bar: 'woz'});

      var contents = fs.readFileSync(filename).toString();

      assert.deepEqual(JSON.parse(contents), {foo: {bar: 'woz'}});
    });
  })
});