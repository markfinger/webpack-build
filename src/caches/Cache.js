import fs from 'fs';
import path from 'path';
import async from 'async';
import mkdirp from 'mkdirp';
import log from '../log';
import packageJson from '../../package';

class Cache {
  constructor(opts) {
    this.filename = opts.cacheFile;
    this.logger = log('cache', opts);

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
  }
  get(cb) {
    let data = this.data;

    if (!data || !Object.keys(data).length) {
      this.logger('no data available');

      return cb(null, null);
    }

    let requiredProps = ['startTime', 'fileDependencies', 'stats', 'config', 'buildHash', 'dependencies', 'assets'];

    for (let prop of requiredProps) {
      if (!data[prop]) {
        this.logger(`cached data is missing the ${prop} prop`);

        return cb(null, null);
      }
    }

    // Check dependency versions
    for (let depName of Object.keys(data.dependencies)) {
      let requiredVersion = data.dependencies[depName];

      let installedVersion;
      if (depName === packageJson.name) {
        installedVersion = packageJson.version
      } else {
        try {
          installedVersion = require(`${depName}/package`).version;
        } catch(err) {
          this.logger(`cached data references a dependency ${depName} which produced an error during version checks`);
          return cb(err, null);
        }
      }

      if (installedVersion !== requiredVersion) {
        let required = `${depName}@${requiredVersion}`;
        let installed = `${depName}@${installedVersion}`;
        this.logger(`cached data requires a package ${required} but the installed version is ${installed}`);

        return cb(null, null);
      }
    }

    // Check the modified times on the config file
    let configFile = data.config.file;
    fs.stat(configFile, (err, stats) => {
      if (err) return cb(err);

      if (+stats.mtime > data.startTime) {
        return cb(
          new Error(`Stale config file: ${configFile}. Compile start time: ${data.startTime}. File mtime: ${+stats.mtime}`)
        );
      }

      // Check the modified times on the file dependencies
      async.each(
        data.fileDependencies,
        (filename, cb) => {
          fs.stat(filename, (err, stats) => {
            if (err) return cb(err);

            if (+stats.mtime > data.startTime) {
              return cb(
                new Error(`Stale file dependency: ${filename}. Compile start time: ${data.startTime}. File mtime: ${+stats.mtime}`)
              );
            }

            cb(null, true);
          });
        },
        (err) => {
          if (err) {
            this.logger(`File dependency error: ${err.message}`);
            return cb(err);
          }

          async.each(
            data.assets,
            (filename, cb) => {
              fs.stat(filename, (err) => {
                if (err) return cb(err);

                cb(null, true);
              });
            },
            (err) => {
              if (err) {
                this.logger(`emmitted asset check error: ${err.message}`);
                return cb(err);
              }

              this.logger('cached data successfully retrieved');
              cb(null, data);
            }
          );
        }
      );
    });
  }
  set(data, delegate) {
    this.data = data;

    if (delegate) {
      // Indicate that the we should no longer rely on the cache's store.
      // This enables the watcher's internal cache to take over the service
      // of cached output
      this.delegate = true;
    }

    this.logger('requesting write to cache file');
    this.write();
  }
  write() {
    if (this.data && Object.keys(this.data)) {
      this.logger('updating cache file');
    } else {
      this.logger('clearing cache file');
    }

    let json = JSON.stringify(this.data, null, 2);

    try {
      mkdirp.sync(path.dirname(this.filename));
    } catch(err) {
      throw new Error(`Failed to create path to webpack cache file: ${this.filename}`);
    }

    try {
      fs.writeFileSync(this.filename, json);
    } catch(err) {
      throw new Error(`Failed to write webpack cache file: ${this.filename}`);
    }
  }
}


export default Cache;