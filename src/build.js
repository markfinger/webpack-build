import options from './options';
import log from './log';
import wrappers from './wrappers';
import cache from './cache';

const build = (opts, cb) => {
  opts = options(opts);

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