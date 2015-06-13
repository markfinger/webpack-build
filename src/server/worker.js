import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import packageJson from '../../package';
import debug from 'debug';
debug.enable(packageJson.name + ':*');

import log from '../log';
import build from '..';
import {processData} from './utils';

log.namespace += `:worker:${process.pid}`;

let logger = log();

logger('ready');

process.send('ready');

process.on('message', function(opts) {
  logger(`received request for build ${opts.buildHash}`);

  build(opts, (err, data) => {
    process.send({
      opts,
      data: processData(err, data)
    });
  });
});
