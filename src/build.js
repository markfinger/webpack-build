import hmr from './hmr';
import env from './env';
import options from './options';
import log from './log';
import Wrapper from './Wrapper';
import wrappers from './wrappers';
import cache from './cache';

const build = (opts, cb) => {
  opts = options(opts);

  let logger = log('build', opts);

  let wrapper = wrappers.get(opts);
  if (!wrapper) {
    logger('creating wrapper');
    wrapper = new Wrapper(opts);
  }

  // Defer so that we can return the wrapper before `cb` is called
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

build.wrappers = wrappers;
build.hmr = hmr;
build.env = env;

export default build;