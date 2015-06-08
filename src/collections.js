import Wrapper from './Wrapper';
import Cache from './Cache';

class Wrappers {
  constructor() {
    this.wrappers = Object.create(null)
  }
  add(wrapper) {
    this.wrappers[wrapper.opts.hash] = wrapper;
  }
  get(opts, cache) {
    let wrapper = this.wrappers[opts.hash];

    if (!wrapper) {
      wrapper = new Wrapper(opts, null, cache);
      this.add(wrapper);
    }

    return wrapper;
  }
  clear() {
    this.wrappers = Object.create(null);
  }
}

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

export {Wrappers, Caches}
