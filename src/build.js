import fs from 'fs';
import _ from 'lodash';
import options from './options';
import log from './log';
import caches from './caches';
import workers from './workers';
import compile from './compile';

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
      logger('cache has no matching data or has delegated');
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