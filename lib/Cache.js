'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var _ = require('lodash');

var Cache = function Cache(filename, logger) {
  this.filename = filename;
  this.updated = Object.create(null);
  this.logger = logger;

  try {
    var data = fs.readFileSync(filename);
    this.data = JSON.parse(data.toString());
  } catch(err) {}

  if (!this.data) {
    this.data = Object.create(null);
  }

  if (this.logger && Object.keys(this.data)) {
    this.logger.info('Webpack: loaded cache file ' + this.filename);
  }

  // Update the file with the current state
  this.write();
};

Cache.prototype.get = function get(cacheKey, cb) {
  var entry = this.data[cacheKey];

  // Ensure that there is both an entry and that it is in the expected form
  if (
    !entry ||
    !(entry && entry.startTime && entry.fileDependencies && entry.stats && entry.config)
  ) {
    return cb(null, null);
  }

  var configFile = entry.config;

  // Check the modified times on the config file and all dependencies
  fs.stat(configFile, function(err, stats) {
    if (err) return cb(err);

    if (+stats.mtime > entry.startTime) {
      return cb(new Error(
        'Stale config file: ' + configFile + '. ' +
        'Compile start time: ' + entry.startTime + '. ' +
        'File mtime: ' + (+stats.mtime)
      ));
    }

    async.each(entry.fileDependencies,
      function(filename, cb) {
        fs.stat(filename, function(err, stats) {
          if (err) return cb(err);

          if (+stats.mtime > entry.startTime) {
            return cb(new Error(
              'Stale file dependency: ' + filename + '. ' +
              'Compile start time: ' + entry.startTime + '. ' +
              'File mtime: ' + (+stats.mtime)
            ));
          }

          cb(null, true);
        });
      },
      function(err) {
        if (err) return cb(err);
        cb(null, entry);
      }
    );
  });
};

Cache.prototype.set = function set(cacheKey, entry, indicateChange) {
  this.data[cacheKey] = entry;

  if (indicateChange) {
    // Indicate that the we should no longer rely on the cache's store.
    // This enables the watcher's internal cache to take over the service
    // of cached output
    this.updated[cacheKey] = true;
  }

  if (this.logger) {
    if (entry) {
      this.logger.info('Webpack: updated cache key ' + cacheKey);
    } else {
      this.logger.info('Webpack: cleared cache key ' + cacheKey);
    }
  }

  this.write();
};

Cache.prototype.write = function write() {
  var json = JSON.stringify(this.data, null, 2);

  try {
    mkdirp.sync(path.dirname(this.filename));
  } catch(err) {
    throw new Error('Failed to create path to webpack cache file: ' + this.filename);
  }

  try {
    fs.writeFileSync(this.filename, json);
  } catch(err) {
    throw new Error('Failed to write webpack cache file: ' + this.filename);
  }

  if (this.logger) {
    this.logger.info('Webpack: updated cache file ' + this.filename);
  }
};

module.exports = Cache;