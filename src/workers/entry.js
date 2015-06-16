import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import packageJson from '../../package';

// TODO: a debug-entry.js file which activates this (needed for a `--debug` arg on the server
//import debug from 'debug';
//debug.enable(packageJson.name + ':*');

import log from '../log';
import {compile} from '../build';
import processData from '../utils/process_data';

log.namespace += `:worker:${process.pid}`;

let logger = log();

logger('ready');

process.send({
  type: 'ready'
});

process.on('message', function(msg) {
  let {type, data} = msg;

  if (type === 'status') {
    logger(`status request received`);
    process.send({
      type: 'status',
      data: 'ok'
    });
  } else if (type === 'build') {
    logger(`build request received for ${data.buildHash}`);

    compile(data, (err, _data) => {
      process.send({
        type: 'build',
        data: {
          buildHash: data.buildHash,
          buildData: processData(err, _data)
        }
      });
    });
  } else {
    throw new Error(`Unknown request received ${msg}`);
  }
});
