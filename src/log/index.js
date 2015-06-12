import debug from 'debug';
import packageJson from '../../package';

let loggers = Object.create(null);

let log = (name, opts) => {
  let packageName = log.namespace;
  let id = opts.buildHash.slice(0, 6);
  let namespace = `${packageName}:${id}:${name}`;

  if (!loggers[namespace]) {
    let logger = debug(namespace);

    // Send messages to stdout
    logger.log = console.log.bind(console);

    loggers[namespace] = logger;
  }

  return loggers[namespace];
};

log.namespace = packageJson.name;

export default log;