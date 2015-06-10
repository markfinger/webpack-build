import socketIoClient from 'socket.io-client';
import stripAnsi from 'strip-ansi';

const opts = JSON.parse(__resourceQuery.slice(1));

const socket = socketIoClient(opts.root + opts.namespace, {
  path: opts.path
});

let currentHash = '';

let reload = () => {
  console.info(`[WPB-HMR] Triggering HMR with hash ${currentHash}...`);

  window.postMessage(`webpackHotUpdate${currentHash}`, '*');
};

socket.on('connect', () => console.info(`[WPB-HMR] Connected to ${opts.root}${opts.path}${opts.namespace}`));

socket.on('hot', () => console.info('[WPB-HMR] Hot Module Replacement enabled'));

socket.on('invalid', () => console.info('[WPB-HMR] Changes detected. Recompiling...'));

socket.on('hash', (hash) => currentHash = hash);

socket.on('no-change', () => console.info('[WPB-HMR] Nothing changed'));

socket.on('success', () => {
  console.info('[WPB-HMR] Compiler completed successfully');
  reload();
});

socket.on('warnings', (warnings) => {
  console.warn('[WPB-HMR] Warnings while compiling...');

  for (let i = 0; i < warnings.length; i++) {
    console.warn(stripAnsi(warnings[i]));
  }

  reload();
});

socket.on('errors', (errors) => {
  console.error('[WPB-HMR] Errors while compiling...');

  for (let i = 0; i < errors.length; i++) {
    console.error(stripAnsi(errors[i]));
  }

  reload();
});

socket.on('disconnect', () => {
  console.warn('[WPB-HMR] Disconnected');
});