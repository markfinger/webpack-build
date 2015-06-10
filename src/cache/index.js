import caches from './caches';

export default {
  get: (opts, cb) => {
    if (!opts.cache) return cb();

    let cache = caches.get(opts);

    if (cache.delegate) {
      cache.logger('delegating');
      return cb();
    }

    cache.get((err, data) => {
      if (err) {
        return cb(err);
      }

      if (!data) {
        return cb();
      }

      if (data.buildHash !== opts.buildHash) {
        cache.logger(`cached build hash "${data.buildHash}" does not match "${opts.buildHash}"`);
        cache.set(null);
        return cb();
      }

      cb(null, data);
    });
  },
  set: (opts, data) => {
    if (!opts.cache) return;

    let delegate = opts.watch;
    let cache = caches.get(opts);
    cache.set(data, delegate);
  }
};
