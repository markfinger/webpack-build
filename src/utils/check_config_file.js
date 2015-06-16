import fs from 'fs';
import _ from 'lodash';

const fileTimestamps = Object.create(null);

const checkConfigFile = (configFile) => {
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
        'Config file has changed since being loaded into memory. The process controlling webpack-build should be restarted'
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