#!/usr/bin/env node

// Ensure source map support as early as possible
import '../utils/source_map_support';

import _ from 'lodash';
import yargs from 'yargs';
import server from '../server';
import workers from '../workers';
import defaults from '../options/defaults';
import packageJson from '../../package';

const argv = yargs
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
    description: 'Specify the number of workers to use',
    default: workers.defaultWorkers
  })
  .version(() => packageJson.version)
  .alias('v', 'version')
  .help('h').alias('h', 'help')
  .strict()
  .argv;

const url = `http://${argv.address}:${argv.port}`;
defaults.hmrRoot = url;

workers.spawn(argv.workers);

console.log(`${packageJson.name} v${packageJson.version}\n`);

for (let worker of workers.workers) {
  console.log(`Worker #${worker.worker.id} - ${worker.worker.process.pid}`);
}

server.listen(argv.port, argv.address, () => {
  console.log(`\nListening at ${url}\n`);
});
