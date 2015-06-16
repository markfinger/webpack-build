import fs from 'fs';
import _ from 'lodash';
import options from './options';
import log from './log';
import wrappers from './wrappers';
import caches from './caches';
import checkConfigFile from './utils/check_config_file';
import workers from './workers';

export const compile = (opts, cb) => {
  opts = options(opts);

  let logger = log('compile', opts);
  logger(`build ${opts.buildHash} requested`);

  // Ensure that the imported version of the config file is fresh
  logger(`checking timestamps on ${opts.config}`);
  let configErr = checkConfigFile(opts.config, cb);
  if (configErr) {
    logger(`error encountered when checking timestamps on ${opts.config}`, configErr.stack);
    return cb(configErr);
  }

  let wrapper = wrappers.get(opts);
  wrapper.onceDone(cb);
};

const build = (opts, cb) => {
  opts = options(opts);

  let logger = log('build', opts);
  logger(`build ${opts.buildHash} requested`);

  let emit = (err, data) => {
    if (err) logger('error encountered during build', err);
    else logger('serving data from build');

    cb(err, data);
  };

  logger('requesting data from caches');
  caches.get(opts, function(err, data) {
    if (err) {
      logger('cache produced an error', err.message);
    }

    if (data) {
      logger('cached data received');
      emit(null, data);
    } else {
      logger('cache has no matching data or has delegated, passing to compiler');
    }

    if (!data) {
      if (workers.available()) {
        logger('Requesting build from workers');
        workers.build(opts, emit);
      } else {
        logger('Requesting build from compile');
        compile(opts, emit);
      }
    } else if (opts.watch) {
      logger('Ensuring compiler is running in the background');
      let noop = () => {/* no-op */};
      if (workers.available()) {
        workers.build(opts, noop);
      } else {
        compile(opts, noop);
      }
    }
  });
};

export default build;