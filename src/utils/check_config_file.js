import fs from 'fs';
import _ from 'lodash';

const fileTimestamps = Object.create(null);

const checkConfigFile = (opts) => {
  let configFile = opts.config;

  if (!configFile) {
    return new Error('Config file not defined');
  }

  if (!_.isString(configFile)) {
    return new Error('Config option must be a string');
  }

  let timestamp;
  try {
    timestamp = +fs.statSync(configFile).mtime;
  } catch(err) {
    err.message = `Cannot find config file ${configFile}: ${err.message}`;
    return err;
  }

  if (!fileTimestamps[configFile]) {
    try {
      require(configFile);
    } catch(err) {
      err.message = `Failed to import config file ${configFile}: ${err.message}`;
      return err;
    }
    fileTimestamps[configFile] = timestamp;
  } else if (timestamp > fileTimestamps[configFile]) {
    return new Error(
      'Config file has changed since being loaded into memory, the process will need to be restarted to apply the changes'
    );
  }
};

export default checkConfigFile;