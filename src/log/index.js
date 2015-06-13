import debug from 'debug';
import packageJson from '../../package';

let loggers = Object.create(null);

let log = (name, opts) => {
  let namespace = log.namespace;

  if (opts) {
    let id = opts.buildHash.slice(0, 6);
    namespace = `${namespace}:${id}:${name}`;
  } else if (name) {
    namespace = `${namespace}:${name}`;
  }

  if (!loggers[namespace]) {
    loggers[namespace] = debug(namespace);
  }

  return loggers[namespace];
};

log.namespace = packageJson.name;

export default log;