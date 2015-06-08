#!/usr/bin/env node

var path = require('path');
var child_process = require('child_process');

var src = path.join(__dirname, '..', 'src');
var lib = path.join(__dirname, '..', 'lib');

var watch = process.argv.indexOf('--watch') !== -1;

// Remove the current build
var rm = child_process.spawnSync('rm', ['-rf', lib]);
var stdout = rm.stdout.toString();
var stderr = rm.stderr.toString();
if (stderr) {
  throw new Error(stderr);
} else if (stdout) {
  console.log(stdout);
}

// Rebuild
var babel;
var babelArgs = [src, '--out-dir', lib, '--source-maps'];
if (watch) {
  babelArgs.push('--watch');
  babel = child_process.spawn(path.join(__dirname, '..', 'node_modules', '.bin', 'babel'), babelArgs);

  babel.stderr.on('data', function(data) {
    process.stderr.write(data);
  });

  babel.stdout.on('data', function(data) {
    process.stdout.write(data);
  });
} else {
  babel = child_process.spawnSync(path.join(__dirname, '..', 'node_modules', '.bin', 'babel'), babelArgs);

  stdout = babel.stdout.toString();
  stderr = babel.stderr.toString();

  if (stderr) {
    throw new Error(stderr);
  } else if (stdout) {
    console.log(stdout);
  }
}