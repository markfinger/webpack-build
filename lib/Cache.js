'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var logger = require('./logger');

var Cache = function Cache(opts) {
  this.filename = opts.cacheFile;
  this.logger = logger('cache', opts);

  // A flag denoting that another part of the system will serve
  // the data, rather than this cache
  this.delegate = false;

  try {
    var data = fs.readFileSync(this.filename);
    this.data = JSON.parse(data.toString());
    this.logger('loaded cache file');
  } catch(err) {
    this.logger('cache load error', err.message);
  }

  if (!this.data) {
    this.data = {};
  }

  // Update the file with the current state
  this.write();
};

Cache.prototype.get = function get(cb) {
  var data = this.data;

  if (!data || !Object.keys(data).length) {
    this.logger('no data available');

    return cb(null, null);
  }

  var requiredProps = ['startTime', 'fileDependencies', 'stats', 'config', 'hash'];

  for (var i=0; i < requiredProps.length; i++) {
    if (!data[requiredProps[i]]) {
      this.logger('cached data is missing the ' + requiredProps[i] + ' prop');

      return cb(null, null);
    }
  }

  var configFile = data.config;

  // Check the modified times on the config file and all dependencies
  fs.stat(configFile, function(err, stats) {
    if (err) return cb(err);

    if (+stats.mtime > data.startTime) {
      return cb(new Error(
        'Stale config file: ' + configFile + '. ' +
        'Compile start time: ' + data.startTime + '. ' +
        'File mtime: ' + (+stats.mtime)
      ));
    }

    async.each(data.fileDependencies,
      function(filename, cb) {
        fs.stat(filename, function(err, stats) {
          if (err) return cb(err);

          if (+stats.mtime > data.startTime) {
            return cb(new Error(
              'Stale file dependency: ' + filename + '. ' +
              'Compile start time: ' + data.startTime + '. ' +
              'File mtime: ' + (+stats.mtime)
            ));
          }

          cb(null, true);
        });
      },
      function(err) {
        if (err) {
          this.logger('cache retrieval error', err.message);
          return cb(err);
        }

        cb(null, data);
      }.bind(this)
    );
  });
};

Cache.prototype.set = function set(data, delegate) {
  this.data = data;

  if (delegate) {
    // Indicate that the we should no longer rely on the cache's store.
    // This enables the watcher's internal cache to take over the service
    // of cached output
    this.delegate = true;
  }

  if (data) {
    this.logger('updated cache file');
  } else {
    this.logger('cleared cache file');
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

  this.logger('updated cache file');
};

module.exports = Cache;