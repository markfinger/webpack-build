import fs from 'fs';
import _ from 'lodash';

const fileTimestamps = Object.create(null);
const buildHashes = Object.create(null);

const checkConfigFile = (opts) => {
  let configFile = opts.config;
  let buildHash = opts.buildHash;

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

  // Ensure that mutated config objects do not cause inexplicable problems
  if (buildHashes[configFile]) {
    if (buildHash != buildHashes[configFile]) {
      let msg = `Config file ${configFile} was previously mutated by build ${buildHashes[configFile]}, the process will need to be restarted to apply a new build`;
      return new Error(msg);
    }
  } else {
    buildHashes[configFile] = buildHash;
  }
};

export default checkConfigFile;