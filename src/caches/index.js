import cluster from 'cluster';
import log from '../log';
import caches from './caches';

export default {
  get: (opts, cb) => {
    // Sanity check
    if (cluster.isWorker) {
      throw new Error('Workers should not fetch from the cache');
    }

    let logger = log('cache-manager', opts);

    if (!opts.cache) {
      logger('cache deactivated');
      return cb(null, null);
    }

    logger('fetching cache');
    let cache = caches.get(opts);

    if (cache.delegate) {
      logger('cache has delegated');
      return cb(null, null);
    }

    logger('requesting data from cache');
    cache.get((err, data) => {
      if (err) {
        logger('cache encountered an error, passing error up');
        return cb(err, null);
      }

      if (!data) {
        logger('cache failed to provide data');
        return cb(null, null);
      }

      if (data.buildHash !== opts.buildHash) {
        logger(`cached build hash "${data.buildHash}" does not match "${opts.buildHash}"`);
        cache.set(null);
        return cb(null, null);
      }

      logger('providing cached data');
      cb(null, data);
    });
  },
  set: (opts, data) => {
    let logger = log('cache-manager', opts);

    if (cluster.isWorker) {
      logger('sending cache signal to master process');
      return process.send({
        type: 'cache',
        data: {
          opts,
          cacheData: data
        }
      });
    }

    if (!opts.cache) {
      logger('caching has been deactivated, data will not be persisted');
      return;
    }

    let delegate = opts.watch;

    logger('fetching cache');
    let cache = caches.get(opts);

    if (delegate && !cache.delegate) {
      logger('cache will now delegate future requests');
    }

    logger('updating cache');
    cache.set(data, delegate);
  },
  clear: () => {
    // Purges the memory cache, but leaves the file system intact
    caches.clear();
  },
  _caches: caches
};
