import debug from 'debug';
import packageJson from '../../package';

let log = (name, opts) => {
  let namespace = log.namespace;

  if (opts) {
    let id = opts.buildHash.slice(0, 6);
    namespace = `${namespace}:${id}:${name}`;
  } else if (name) {
    namespace = `${namespace}:${name}`;
  }

  return debug(namespace);
};

log.namespace = packageJson.name;

export default log;