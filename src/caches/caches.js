import Cache from './Cache';

class Caches {
  constructor() {
    this.caches = Object.create(null);
  }
  get(opts) {
    if (!this.caches[opts.cacheFile]) {
      this.caches[opts.cacheFile] = new Cache(opts);
    }

    return this.caches[opts.cacheFile];
  }
  clear() {
    this.caches = Object.create(null);
  }
}

export default new Caches();