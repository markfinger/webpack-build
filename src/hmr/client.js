import socketIoClient from 'socket.io-client';
import stripAnsi from 'strip-ansi';

const opts = JSON.parse(__resourceQuery.slice(1));

const socket = socketIoClient(opts.root + opts.namespace, {
  path: opts.path
});

let currentHash = '';

let reload = () => {
  console.info('[WPW-HMR] Triggering HMR with hash ' + currentHash + '...');

  window.postMessage('webpackHotUpdate' + currentHash, '*');
};

socket.on('connect', () => console.info('[WPW-HMR] Connected to ' + opts.root + opts.path + opts.namespace));

socket.on('hot', () => console.info('[WPW-HMR] Hot Module Replacement enabled'));

socket.on('invalid', () => console.info('[WPW-HMR] Changes detected. Recompiling...'));

socket.on('hash', (hash) => currentHash = hash);

socket.on('no-change', () => console.info('[WPW-HMR] Nothing changed'));

socket.on('success', () => {
  console.info('[WPW-HMR] Compiler completed successfully');
  reload();
});

socket.on('warnings', (warnings) => {
  console.warn('[WPW-HMR] Warnings while compiling...');

  for (let i = 0; i < warnings.length; i++) {
    console.warn(stripAnsi(warnings[i]));
  }

  reload();
});

socket.on('errors', (errors) => {
  console.error('[WPW-HMR] Errors while compiling...');

  for (let i = 0; i < errors.length; i++) {
    console.error(stripAnsi(errors[i]));
  }

  reload();
});

socket.on('disconnect', () => {
  console.warn('[WPW-HMR] Disconnected');
});