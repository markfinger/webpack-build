#!/usr/bin/env node

'use strict';

var packageJson = require('../package');
var argv = require('yargs')
  .option('p', {
    alias: 'port',
    description: 'Run the server at the specified port'
  })
  .option('r', {
    alias: 'root',
    description: 'Set the root directory for the server'
  })
  .version(function() {
    return packageJson.version;
  }).alias('v', 'version')
  .help('h').alias('h', 'help')
  .strict()
  .argv;

var Server = require('../lib/server');

var server = new Server;
var port = argv.port || 9009;

server.listen(port, function() {
  console.log(packageJson.name + ' listening at http://127.0.0.1:' + port + '\n');
});
