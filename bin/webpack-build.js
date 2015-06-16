#!/usr/bin/env node

'use strict';

var packageJson = require('../package');

var argv = require('yargs')
  .option('p', {
    alias: 'port',
    description: 'Specify the server\'s port',
    default: 9009
  })
  .option('a', {
    alias: 'address',
    description: 'Specify the server\'s address',
    default: '127.0.0.1'
  })
  .option('w', {
    alias: 'workers',
    description: 'Specifies the number of workers to use'
  })
  .version(function() {
    return packageJson.version;
  }).alias('v', 'version')
  .help('h').alias('h', 'help')
  .strict()
  .argv;

require('source-map-support').install();

var _ = require('lodash');
var server = require('../lib/server');
var workers = require('../lib/workers');
var defaults = require('../lib/options/defaults');

workers.spawn(argv.workers);

server.listen(argv.port, argv.address, function() {
  var address = server.address();

  var fullAddress = 'http://' + address.address + ':' + address.port;
  defaults.hmrRoot = fullAddress;

  var width = 80;
  console.log(
    [
      _.repeat('~', width),
      _.pad('webpack-build v' + packageJson.version, width),
      _.pad((new Date).toLocaleString(), width),
      _.pad(fullAddress, width),
      _.pad(workers.count() + ' worker' + (workers.count() > 1 ? 's' : ''), width),
      _.repeat('~', width)
    ].join('\n') + '\n'
  );
});
