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

  if (fileTimestamps[configFile]) {
    let timestamp;
    try {
      timestamp = +fs.statSync(configFile).mtime;
    } catch(err) {
      return err;
    }

    if (timestamp > fileTimestamps[configFile]) {
      return new Error(
        'Config file has changed since being loaded into memory, the process will need to be restarted to apply the changes'
      );
    }
  } else {
    try {
      require(configFile);
    } catch(err) {
      return err;
    }

    try {
      fileTimestamps[configFile] = +fs.statSync(configFile).mtime;
    } catch(err) {
      return err;
    }
  }
};

export default checkConfigFile;