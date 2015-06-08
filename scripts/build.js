#!/usr/bin/env node

// Builds the project
// Usage: ./build.js
// Usage: ./build.js --watch

var path = require('path');
var child_process = require('child_process');

var watch = process.argv.indexOf('--watch') !== -1;

var src = path.join(__dirname, '..', 'src');
var lib = path.join(__dirname, '..', 'lib');
var testSrc = path.join(__dirname, '..', 'test', 'src');
var testLib = path.join(__dirname, '..', 'test', 'lib');
var inputDirs = [src, testSrc];
var outputDirs = [lib, testLib];

for (var i=0; i<outputDirs.length; i++) {
  // Remove the current build
  console.log('Removing ' + outputDirs[i]);
  var rm = child_process.spawnSync('rm', ['-rf', outputDirs[i]]);
  var stdout = rm.stdout.toString();
  var stderr = rm.stderr.toString();
  if (stderr) {
    throw new Error(stderr);
  } else if (stdout) {
    console.log(stdout);
  }

  // Rebuild
  var babel;
  var babelArgs = [inputDirs[i], '--out-dir', outputDirs[i], '--source-maps'];
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
}