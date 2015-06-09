import hmr from './hmr';
import env from './env';
import Wrapper from './Wrapper';
import options from './options';
import log from './log';
import {Wrappers, Caches} from './collections';

const wrappers = new Wrappers();
const caches = new Caches();

const build = (opts, cb) => {
  opts = options(opts);

  let logger = log('build', opts);

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
          logger(`cached hash "${data.hash}" does not match the expected`);
          cache.set(null);
          return wrapper.onceDone(cb);
        }

        if (opts.watch) {
          logger('Ensuring watcher has started');
          wrapper.onceDone(() => { /* no-op */});
        }

        logger('serving cached output');
        cb(null, data);
      });
    }
  });

  return wrapper;
};

build.wrappers = wrappers;
build.caches = caches;
build.hmr = hmr;
build.env = env;

export default build;