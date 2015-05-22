var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var _ = require('lodash');

var Cache = function Cache(filename, ttl) {
  this.filename = filename;
  this.ttl = ttl;
  this.updated = Object.create(null);

  try {
    var data = fs.readFileSync(filename);
    this.cache = JSON.parse(data.toString());
  } catch(err) {}

  if (this.cache && this.ttl) {
    var expiry = +new Date - ttl;
    this.cache = _.transform(this.cache, function(result, value, key) {
      if (value.startTime > expiry) {
        result[key] = value;
      }
    }, Object.create(null));
  }

  if (!this.cache) {
    this.cache = Object.create(null);
  }
};

Cache.prototype.get = function get(configFile, cb) {
  var entry = this.cache[configFile];

  // Ensure that there is both an entry and that it is in
  // the expected form
  if (
    !entry ||
    !(entry && entry.startTime && entry.fileDependencies && entry.stats)
  ) {
    return cb(null, null);
  }

  // Check the modified times on the config file and all dependencies
  fs.stat(configFile, function(err, stats) {
    if (err) return cb(err);

    if (+stats.mtime > entry.startTime) {
      var message = 'Stale config file: ' + configFile + '. Compile start time: ' + entry.startTime + '. File mtime: ' + +stats.mtime;
      return cb(new Error(message));
    }

    async.each(entry.fileDependencies,
      function(filename, cb) {
        fs.stat(filename, function(err, stats) {
          if (err) return cb(err);

          if (+stats.mtime > entry.startTime) {
            var message = 'Stale file dependency: ' + filename + '. Compile start time: ' + entry.startTime + '. File mtime: ' + +stats.mtime;
            return cb(new Error(message));
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

Cache.prototype.set = function set(filename, entry) {
  this.cache[filename] = entry;

  // Indicate that the compiler has run and we should no
  // longer rely on the cache's store. This enables the
  // watcher to take over once it has run
  this.updated[filename] = true;

  var json = JSON.stringify(this.cache);

  try {
    // Sync writes to avoid any async collisions
    mkdirp.sync(path.dirname(this.filename));
    fs.writeFileSync(this.filename, json);
  } catch(err) {
    console.error('Failed to write webpack cache file ' + this.filename, err.stack);
  }
};

module.exports = Cache;