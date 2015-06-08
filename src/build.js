import Wrapper from './Wrapper';
import options from './options';
import _logger from './logger';
import {Wrappers, Caches} from './collections';

const wrappers = new Wrappers();
const caches = new Caches();

const build = (opts, cb) => {
  opts = options.generate(opts);

  let logger = _logger('build', opts);

  let cache;
  if (opts.cache) {
    logger('cache enabled');
    cache = caches.get(opts);
  }

  let wrapper = wrappers.get(opts, cache);

  // Defer so that we can return the wrapper before `cb` is called
  process.nextTick(() => {
    if (!cache || cache.delegate) {
      if (cache.delegate) {
        logger('cache has delegated to wrapper');
      }

      wrapper.onceDone(cb);
    } else {
      logger('requesting data from cache');

      cache.get((err, data) => {
        if (err) {
          logger('cache error', err.message);
          return wrapper.onceDone(cb);
        }

        if (!data) {
          logger('cache failed to provide data, calling wrapper');
          return wrapper.onceDone(cb);
        }

        if (data.hash !== opts.hash) {
          logger('cached hash "' + data.hash + '" does not match the expected');

          cache.set(null);
          return wrapper.onceDone(cb);
        }

        if (opts.watch && !wrapper.isWatching) {
          logger('starting watcher');

          // Start the watcher
          wrapper.onceDone(() => { /* no-op */});
        }

        logger('serving cached output');

        cb(null, data.stats);
      });
    }
  });

  return wrapper;
};

build.wrappers = wrappers;
build.caches = caches;

export default build;