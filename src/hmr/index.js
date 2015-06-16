import path from 'path';
import cluster from 'cluster';
import _ from 'lodash';
import socketIo from 'socket.io';
import defaults from '../options/defaults';
import log from '../log';

const logger = log('hmr');
const namespaces = Object.create(null);

let io = null;

export const addToServer = (server) => {
  io = socketIo(server, {path: defaults.hmrPath});
};

const getNamespace = (opts) => {
  return namespaces[opts.hmrNamespace];
};

export const register = (opts) => {
  if (cluster.isWorker) {
    return process.send({
      type: 'hmr-register',
      data: {opts}
    });
  }

  let namespace = opts.hmrNamespace;

  if (!namespaces[namespace]) {
    let nsp = io.of(namespace);

    namespaces[namespace] = nsp;

    nsp.on('connection', (socket) => {
      logger(`namespace ${namespace} opened connection ${socket.id}`);

      socket.emit('hot');
    });

    logger(`registered hmr namespace: ${namespace}`);
  }
};

export const emitDone = (opts, stats) => {
  if (_.isFunction(stats.toJson)) {
    stats = stats.toJson();
  }

  if (cluster.isWorker) {
    return process.send({
      type: 'hmr-done',
      data: {
        opts,
        stats
      }
    });
  }

  logger(`emitting done signal to ${opts.hmrNamespace}`);

  let nsp = getNamespace(opts);

  if (
    stats &&
    stats.assets &&
    stats.assets.every((asset) => {
      return !asset.emitted;
    })
  ) {
    return nsp.emit('no-change');
  }

  nsp.emit('hash', stats.hash);

  if (stats.errors.length > 0) {
    nsp.emit('errors', stats.errors);
  } else if (stats.warnings.length > 0) {
    nsp.emit('warnings', stats.warnings);
  } else {
    nsp.emit('success');
  }
};

export const emitInvalid = (opts) => {
  if (cluster.isWorker) {
    return process.send({
      type: 'hmr-invalid',
      data: {opts}
    });
  }

  logger(`emitting invalid signal to ${opts.hmrNamespace}`);

  let nsp = getNamespace(opts);
  nsp.emit('invalid');
};

export default {
  addToServer,
  register,
  emitInvalid,
  emitDone
}