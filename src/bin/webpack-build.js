#!/usr/bin/env node

// Ensure source map support as early as possible
import '../utils/source_map_support';

import 'babel/polyfill';
import path from 'path';
import pathIsAbsolute from 'path-is-absolute'; // used for compatibility
import fs from 'fs';
import _ from 'lodash';
import yargs from 'yargs';
import chalk from 'chalk';
import build from '..';
import options from '../options'
import server from '../server';
import workers from '../workers';
import defaults from '../options/defaults';
import packageJson from '../../package';

const argv = yargs
  .option('c', {
    alias: 'config',
    description: 'A path to a config file',
    default: 'webpack.config.js'
  })
  .option('d', {
    alias: 'development',
    description: 'Activate development mode',
    default: false
  })
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
  .option('s', {
    alias: 'server',
    description: 'Run a build server',
    default: false
  })
  .option('hmr', {
    alias: 'hot-module-replacement',
    description: 'Activate hot-module-replacement',
    default: options.defaults.hmr
  })
  .option('pp', {
    alias: 'public-path',
    description: 'Defines the publicPath build option',
    default: options.defaults.publicPath
  })
  .option('w', {
    alias: 'watch',
    description: 'Activates a watching compiler',
    default: options.defaults.watch
  })
  .option('wo', {
    alias: 'workers',
    description: 'Specify the number of workers to use',
    default: workers.defaultWorkers
  })
  .version(() => packageJson.version)
  .alias('v', 'version')
  .help('h').alias('h', 'help')
  .strict()
  .argv;

let config = argv.config;
if (!pathIsAbsolute(config)) {
  config = path.join(process.cwd(), config);
}
if (!fs.existsSync(config)) {
  config = null;
}

const startupOutput = [];

startupOutput.push(`${packageJson.name} v${packageJson.version}\n`);

if (!config && !argv.server) {
  throw new Error('Config file "webpack.config.js" does not exist or the --server argument has not been specified');
}

if (argv.hmr) {
  argv.watch = true;
}

function emitBuildInformation(err, data) {
  if (err) {
    console.error(chalk.red(err.stack || err));
  } else {
    console.log(chalk.blue(`Files emitted:`));
    for (let asset of data.assets) {
      console.log(chalk.blue(`  ${asset}`));
    }
  }
}

function buildConfigFile(config) {
  console.log(`Building ${config}...\n`);

  build({
    config: config,
    watch: argv.watch,
    context: {
      development: argv.development
    },
    hmr: argv.hmr,
    publicPath: argv.publicPath
  }, emitBuildInformation);
}

const url = `http://${argv.address}:${argv.port}`;

if (argv.server || argv.hmr) {
  defaults.hmrRoot = url;

  workers.spawn(argv.workers);
  for (let worker of workers.workers) {
    startupOutput.push(`Worker #${worker.worker.id} - ${worker.worker.process.pid}`);
  }
}

function flushStartupOutput() {
  for (let message of startupOutput) {
    console.log(message);
  }
}

if (argv.server) {
  server.listen(argv.port, argv.address, () => {
    startupOutput.push(`\nListening at ${url}\n`);
    flushStartupOutput();
  });
} else if (argv.hmr) {
  server.listen(argv.port, argv.address, () => {
    startupOutput.push(`\nListening at ${url}\n`);
    flushStartupOutput();

    buildConfigFile(config);
  });
} else {
  flushStartupOutput();
  buildConfigFile(config);
}
