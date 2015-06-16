import os from 'os';
import _ from 'lodash';
import options from '../options';
import Worker from './Worker';

class Workers {
  constructor() {
    this.workers = [];
    this.next = 0;
    this.matches = Object.create(null);
  }
  available() {
    return this.workers.length > 0;
  }
  count() {
    return this.workers.length;
  }
  spawn(number) {
    // Spawns the number of workers specified

    number = number || 1;

    _.range(number).forEach(() => {
      this.workers.push(new Worker());
    });
  }
  build(opts, cb) {
    // Passes `opts` to an available worker

    opts = options(opts);

    if (!this.available()) {
      return cb(new Error('No workers available'));
    }

    let worker = this.match(opts);

    if (!worker) {
      worker = this.get(worker);
      this.matches[opts.buildHash] = worker.id;
    }

    worker.build(opts, cb);
  }
  match(opts) {
    // Returns a worker, if any, which has previously build `opts` and is likely
    // to have a warm compiler

    let key = opts.buildHash;
    let id = this.matches[key];
    if (id) {
      return _.find(this.workers, {id});
    }
  }
  get() {
    // Returns the next available worker

    let worker = this.workers[this.next];

    this.next++;
    if (this.next >= this.workers.length) {
      this.next = 0;
    }

    return worker;
  }
  clear() {
    for (let worker of this.workers) {
      worker.kill();
    }
    this.workers = [];
    this.matches = Object.create(null);
    this.next = 0;
  }
}

export default new Workers();