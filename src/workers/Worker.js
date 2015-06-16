import os from 'os';
import path from 'path';
import cluster from 'cluster';
import _ from 'lodash';
import caches from '../caches';
import options from '../options';
import log from '../log';

cluster.setupMaster({
  exec: path.join(__dirname, 'entry.js'),
  // Prevent the workers from running their own debugger
  args: _.without(process.argv.slice(2), '--debug-brk', 'debug')
});

class Worker {
  constructor() {
    this.err = null;
    this.isReady = false;
    this._onReady = [];
    this._onStatus = [];
    this._onBuild = Object.create(null);

    this.worker = cluster.fork();
    this.id = this.worker.id;

    this.logger = log(`worker-manager:${this.id}`);

    this.worker.on('message', this.handleMessage.bind(this));
    this.worker.on('error', this.handleError.bind(this));
    this.worker.on('exit', this.handleExit.bind(this));

    this.worker.process.on('exit', this.kill.bind(this));
    this.worker.process.on('uncaughtException', this.kill.bind(this));

    this.logger(`started worker ${this.id}`);
  }
  build(opts, cb) {
    opts = options(opts);

    // Sanity checks
    if (!cb) throw new Error('No callback provided to build');
    if (!opts.buildHash) throw new Error('No buildHash defined');

    let buildHash = opts.buildHash;

    let buildRequests = this._onBuild[buildHash];
    if (!buildRequests) {
      buildRequests = this._onBuild[buildHash] = [];
    }

    buildRequests.push(cb);

    if (buildRequests.length === 1) {
      this.onReady(err => {
        if (err) {
          return this._callBuildRequests(buildHash, err, null);
        }

        this.logger(`sending build request for ${buildHash} to worker ${this.id}`);
        this.worker.send({
          type: 'build',
          data: opts
        });
      });
    } else {
      this.logger(`enqueuing build request for ${buildHash}, awaiting worker ${this.id}`);
    }
  }
  getStatus(cb) {
    this.onReady(err => {
      if (err) return cb(err);

      this._onStatus.push(cb);

      this.logger(`sending status request to worker ${this.id}`);
      this.worker.send({
        type: 'status'
      });
    });
  }
  onReady(cb) {
    this._onReady.push(cb);

    if (this.isReady || this.err) {
      this._callReady(this.err);
    }
  }
  handleMessage(msg) {
    if (!_.isObject(msg)) {
      throw new Error(`Malformed worker message: "${msg}"`);
    }

    if (!msg.type) {
      throw new Error(`Worker message lacks a type prop: ${JSON.stringify(msg)}`);
    }

    let {type, data} = msg;

    if (type === 'ready') {

      this.logger(`worker ${this.id} ready`);
      this.isReady = true;
      this._callReady(null);

    } else if (type === 'status') {

      this.logger(`worker ${this.id} responded to status request`);
      this._callStatusRequests(null, data);

    } else if (type === 'build') {

      let {buildHash, buildData} = data;
      this.logger(`worker ${this.id} responded to build request ${buildHash}`);
      this._callBuildRequests(buildHash, buildData.error, buildData.data);

    } else if (type === 'cache') {

      let {opts, cacheData} = data;
      this.logger(`worker ${this.id} sent a cache signal for build ${opts.buildHash}`);
      caches.set(opts, cacheData);

    // TODO hmr update support

    } else {
      throw new Error(`Unknown message type "${type}" from worker ${this.worker.id}: ${JSON.stringify(msg)}`);
    }
  }
  handleError(err) {
    this.logger(`worker process ${this.id} error: ${err}`);

    this.err = err;
    this.isReady = false;

    this._flushCallbacks(err);
  }
  handleExit(code) {
    this.logger(`worker process ${this.id} exited with code ${code}`);
    this.isReady = false;

    if (!this.err) {
      this.err = new Error(`worker process ${this.id} has already exited with code ${code}`)
    }

    this._flushCallbacks(this.err);
  }
  _callReady(err) {
    let onReady = this._onReady;
    this._onReady = [];
    onReady.forEach((cb) => cb(err));
  }
  _callStatusRequests(err, data) {
    let onStatus = this._onStatus;
    this._onStatus = [];
    onStatus.forEach((cb) => cb(err, data));
  }
  _callBuildRequests(buildHash, err, data) {
    // Sanity checks
    if (!buildHash) {
      throw new Error(`buildHash not defined. Received ${buildHash} with ${err} and ${data}`);
    }
    if (!this._onBuild[buildHash]) {
      throw new Error(`Unknown build hash ${buildHash} in ${JSON.stringify(this._onBuild)}`);
    }

    let onBuild = this._onBuild[buildHash];
    this._onBuild[buildHash] = [];
    onBuild.forEach((cb) => cb(err, data));
  }
  _flushCallbacks(err) {
    this._callReady(err);
    this._callStatusRequests(err, null);
    for (let buildHash in this._onBuild) {
      this._callBuildRequests(buildHash, err, null);
    }
  }
  kill() {
    if (!this.worker.isDead()) {
      this.logger(`killing worker process ${this.id}`);
      this.worker.kill();
    }
  }
}

export default Worker;