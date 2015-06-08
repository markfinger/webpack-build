import path from 'path';
import socketIo from 'socket.io';
import * as options from '../options';

let io = null;

export const addTo = (server, path) => {
  path = path || options.generate().hmrPath;

  io = socketIo(server, {path: path});
};

export const send = (nsp, stats) => {
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

export const bindCompiler = (compiler, opts) => {
  const namespace = opts.hmrNamespace;
  const logger = opts.logger;
  const nsp = io.of(namespace);

  logger(`bound compiler under hmr namespace: ${namespace}`);

  nsp.on('connection', (socket) => {
    logger(`hmr namespace ${namespace} opened connection ${socket.id}`);

    socket.emit('hot');
  });

  compiler.plugin('invalid', () => {
    logger(`sending hmr invalid signal to ${namespace}`);

    nsp.emit('invalid');
  });

  compiler.plugin('done', (stats) => {
    logger(`sending updated stats to ${namespace}`);

    send(nsp, stats.toJson());
  });
};