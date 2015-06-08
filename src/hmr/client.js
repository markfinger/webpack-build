import socketIoClient from 'socket.io-client';
import stripAnsi from 'strip-ansi';

const opts = JSON.parse(__resourceQuery.slice(1));

const socket = socketIoClient(opts.root + opts.namespace, {
  path: opts.path
});

let currentHash = '';

let reload = () => {
  console.info(`[WB-HMR] Triggering HMR with hash ${currentHash}...`);

  window.postMessage(`webpackHotUpdate${currentHash}`, '*');
};

socket.on('connect', () => console.info(`[WB-HMR] Connected to ${opts.root}${opts.path}${opts.namespace}`));

socket.on('hot', () => console.info('[WB-HMR] Hot Module Replacement enabled'));

socket.on('invalid', () => console.info('[WB-HMR] Changes detected. Recompiling...'));

socket.on('hash', (hash) => currentHash = hash);

socket.on('no-change', () => console.info('[WB-HMR] Nothing changed'));

socket.on('success', () => {
  console.info('[WB-HMR] Compiler completed successfully');
  reload();
});

socket.on('warnings', (warnings) => {
  console.warn('[WB-HMR] Warnings while compiling...');

  for (let i = 0; i < warnings.length; i++) {
    console.warn(stripAnsi(warnings[i]));
  }

  reload();
});

socket.on('errors', (errors) => {
  console.error('[WB-HMR] Errors while compiling...');

  for (let i = 0; i < errors.length; i++) {
    console.error(stripAnsi(errors[i]));
  }

  reload();
});

socket.on('disconnect', () => {
  console.warn('[WB-HMR] Disconnected');
});