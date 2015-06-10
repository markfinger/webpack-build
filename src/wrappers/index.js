import Wrapper from './Wrapper';

class Wrappers {
  constructor() {
    this.wrappers = Object.create(null)
  }
  add(wrapper) {
    this.wrappers[wrapper.opts.buildHash] = wrapper;
  }
  get(opts) {
    let wrapper = this.wrappers[opts.buildHash];

    if (!wrapper) {
      wrapper = new Wrapper(opts);
      this.add(wrapper);
    }

    return wrapper;
  }
  clear() {
    this.wrappers = Object.create(null);
  }
}

export default new Wrappers();