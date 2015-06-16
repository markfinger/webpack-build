import fs from 'fs';
import _ from 'lodash';
import options from './options';
import log from './log';
import wrappers from './wrappers';
import caches from './caches';

const fileTimestamps = Object.create(null);

const checkConfigfile = (configFile) => {
  if (!configFile) {
    return new Error('Config file not defined');
  }

  if (!_.isString(configFile)) {
    return new Error('Config file option must be a string');
  }

  if (fileTimestamps[configFile]) {
    let timestamp;
    try {
      timestamp = +fs.statSync(configFile).mtime;
    } catch(err) {
      return err;
    }

    if (timestamp > fileTimestamps[configFile]) {
      return new Error('Config file has changed since being loaded into memory. Restart the process');
    }
  } else {
    try {
      require(configFile);
    } catch(err) {
      return err;
    }

    try {
      fileTimestamps[configFile] = +fs.statSync(configFile).mtime;
    } catch(err) {
      return err;
    }
  }
};

const build = (opts, cb) => {
  opts = options(opts);

  let logger = log('build', opts);
  logger(`build request lodged for ${opts.config}`);

  logger('requesting data from caches');
  caches.get(opts, function(err, data) {
    if (err) {
      logger('cache produced an error', err.message);
    }

    let emit = (err, data) => {
      if (err) {
        logger('error encountered during build', err);
      } else {
        logger('serving data from build');
      }
      cb(err, data)
    };

    if (data) {
      logger('cached data received');
      emit(null, data);
    } else {
      logger('cache has no matching data or has delegated, calling wrapper');
    }

    if (!data || opts.watch) {
      // Ensure that the imported version of the config file is fresh
      logger(`checking timestamps on ${opts.config}`);
      let configErr = checkConfigfile(opts.config, cb);
      if (configErr) {
        logger(`error encountered when checking timestamps on ${opts.config}`, configErr.stack);
        return cb(configErr);
      }

      let wrapper = wrappers.get(opts);

      if (!data) {
        return wrapper.onceDone(emit);
      }

      if (opts.watch && !wrapper.watcher) {
        logger('Starting watcher in the background');
        wrapper.onceWatcherDone(() => { /* no-op */});
      }
    }
  });
};

export default build;