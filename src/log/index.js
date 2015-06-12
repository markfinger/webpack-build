import debug from 'debug';
import packageJson from '../../package';

const loggers = Object.create(null);

export default (name, opts) => {
  let packageName = packageJson.name;
  let id = opts.buildHash.slice(0, 6);
  let namespace = `${packageName}:${id}:${name}`;

  if (!loggers[namespace]) {
    loggers[namespace] = debug(namespace);
  }

  return loggers[namespace];
};