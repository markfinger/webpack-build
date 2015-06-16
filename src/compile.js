import options from './options';
import log from './log';
import wrappers from './wrappers';
import checkConfigFile from './utils/check_config_file';

export const compile = (opts, cb) => {
  opts = options(opts);

  let logger = log('compile', opts);
  logger(`build ${opts.buildHash} requested`);

  // Ensure that the imported version of the config file is fresh
  logger(`checking timestamps on ${opts.config}`);
  let configErr = checkConfigFile(opts.config, cb);
  if (configErr) {
    logger(`error encountered when checking timestamps on ${opts.config}`, configErr.stack);
    return cb(configErr);
  }

  let wrapper = wrappers.get(opts);
  wrapper.onceDone(cb);
};

export default compile;