import path from 'path';
import child_process from 'child_process';
import _ from 'lodash';
import log from '../log';

const logger = log('worker:manager');

export const workers = [];

const builds = {};

let nextWorker = -1;

export const send = (opts, cb) => {
  if (!workers.length) {
    return cb(new Error('No workers available'));
  }

  if (!builds[opts.buildHash]) {
    nextWorker++;
    if (nextWorker >= workers.length) {
      nextWorker = 0;
    }
    let worker = workers[nextWorker];
    builds[opts.buildHash] = {
      opts,
      worker,
      requests: []
    };
  }

  let build = builds[opts.buildHash];
  build.requests.push(cb);

  logger(`sending build request ${opts.buildHash} to worker ${build.worker.pid}`);
  build.worker.send(opts);
};

export const addWorker = () => {
  logger('spawning worker');
  let worker = child_process.fork(
    path.join(__dirname, 'worker.js')
  );

  let isReady = false;

  worker.on('message', function(obj) {
    if (isReady) {
      let {opts, data} = obj;

      logger(`worker ${worker.pid} responded to build request ${opts.buildHash}`);

      let build = builds[opts.buildHash];
      let requests = build.requests;
      build.requests = [];

      requests.forEach(cb => cb(null, data));
    } else if (obj === 'ready') {
      isReady = true;
      workers.push(worker);
      logger(`worker ${worker.pid} ready`);
    } else {
      throw new Error(`Unexpected response from worker: "${obj}"`);
    }
  });

  worker.on('error', (err) => {
    logger(`worker process ${worker.pid} error: ${err}`);
  });

  worker.on('exit', (code) => {
    logger(`worker process ${worker.pid} exited with code ${code}`);
    _.remove(workers, worker);
  });
};