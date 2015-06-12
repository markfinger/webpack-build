import fs from 'fs';
import options from './options';
import log from './log';
import wrappers from './wrappers';
import cache from './cache';

let fileTimestamps = Object.create(null);

let checkConfigfile = (configFile, cb) => {
  // Synchronous check to ensure that config files have
  // not changed since they were loaded

  if (!configFile) return true;

  if (!fileTimestamps[configFile]) {
    try {
      require(configFile);
    } catch(err) {
      cb(err);
      return false;
    }

    try {
      fileTimestamps[configFile] = +fs.statSync(configFile).mtime;
    } catch(err) {
      cb(err);
      return false;
    }
  } else {
    let timestamp;
    try {
      timestamp = +fs.statSync(configFile).mtime;
    } catch(err) {
      cb(err);
      return false;
    }

    if (timestamp > fileTimestamps[configFile]) {
      cb(new Error('Config file has changed since being loaded into memory. Restart the process'));
      return false;
    }
  }

  return true;
};

const build = (opts, cb) => {
  opts = options(opts);

  // Ensure that our version of the config file is fresh
  if (!checkConfigfile(opts.config, cb)) {
    return;
  }

  let logger = log('build', opts);
  logger(`build request lodged for ${opts.config}`);

  let wrapper = wrappers.get(opts);

  // Defer so that we can return the wrapper before `cb` is called
  // This adds a tiny overhead, but makes testing much easier to
  // reason about
  process.nextTick(() => {
    logger('requesting data from cache');
    cache.get(opts, function(err, data) {
      if (err) {
        logger('cache produced an error', err.message);
      }

      if (!data) {
        logger('cache failed to provide data, calling wrapper');
        return wrapper.onceDone(cb);
      }

      if (opts.watch) {
        logger('Ensuring watcher has started');
        wrapper.onceDone(() => { /* no-op */});
      }

      logger('serving cached output');
      return cb(null, data);
    });
  });

  return wrapper;
};

export default build;