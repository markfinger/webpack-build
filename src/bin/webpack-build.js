import sourceMapSupport from 'source-map-support';

sourceMapSupport.install({
  handleUncaughtExceptions: false
});

import packageJson from '../../package';
import yargs from 'yargs';

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
    description: 'Specifies the number of workers to use'
  })
  .version(() => packageJson.version)
  .alias('v', 'version')
  .help('h').alias('h', 'help')
  .strict()
  .argv;

import _ from 'lodash';
import server from '../server';
import workers from '../workers';
import defaults from '../options/defaults';

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
