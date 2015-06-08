import fs from 'fs';
import path from 'path';
import async from 'async';
import mkdirp from 'mkdirp';
import logger from './logger';
import packageJson from '../package';

class Cache {
  constructor(opts) {
    this.filename = opts.cacheFile;
    this.logger = logger('cache', opts);

    // A flag denoting that another part of the system will serve
    // the data, rather than this cache
    this.delegate = false;

    try {
      let data = fs.readFileSync(this.filename);
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
  }
  get(cb) {
    let data = this.data;

    if (!data || !Object.keys(data).length) {
      this.logger('no data available');

      return cb(null, null);
    }

    let requiredProps = ['startTime', 'fileDependencies', 'stats', 'config', 'hash', 'dependencies'];

    for (let i=0; i<requiredProps.length; i++) {
      if (!data[requiredProps[i]]) {
        this.logger('cached data is missing the ' + requiredProps[i] + ' prop');

        return cb(null, null);
      }
    }

    // Check dependency versions
    const depNames = Object.keys(data.dependencies);
    for (let i=0; i<depNames.length; i++) {
      let depName = depNames[i];
      let requiredDepVersion = data.dependencies[depName];

      let depVersion;
      if (depName === packageJson.name) {
        depVersion = packageJson.version
      } else {
        try {
          depVersion = require(depName + '/package').version;
        } catch(err) {
          this.logger('cached data references a dependency ' + depName + ' which produced an error during version checks');
          return cb(err, null);
        }
      }

      if (depVersion !== requiredDepVersion) {
        this.logger(
          'cached data references a dependency ' + depName + '@' + requiredDepVersion + ' but the ' +
          'installed version is ' + depName + '@' + requiredDepVersion
        );

        return cb(null, null);
      }
    }

    // Check the modified times on the config file
    let configFile = data.config;
    fs.stat(configFile, function(err, stats) {
      if (err) return cb(err);

      if (+stats.mtime > data.startTime) {
        return cb(new Error(
          'Stale config file: ' + configFile + '. ' +
          'Compile start time: ' + data.startTime + '. ' +
          'File mtime: ' + (+stats.mtime)
        ));
      }

      // Check the modified times on the file dependencies
      async.each(
        data.fileDependencies,
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

          this.logger('serving cached data');
          cb(null, data);
        }.bind(this)
      );
    }.bind(this));
  }
  set(data, delegate) {
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
  }
  write() {
    let json = JSON.stringify(this.data, null, 2);

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
  }
}


export default Cache;