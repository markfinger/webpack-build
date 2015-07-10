import stripAnsi from 'strip-ansi';
import _ from 'lodash';

const cleanError = (err) => {
  // Strips ansi sequences from the error's strings

  if (_.isString(err)) {
    return stripAnsi(err);
  }

  let error = {
    type: err.constructor.name,
    message: stripAnsi(err.message)
  };

  if (err.stack) {
    error.stack = stripAnsi(err.stack);
  }

  return error;
};

const processData = (err, data) => {
  // Processes data for communication between processes

  let error = null;
  if (err) {
    error = cleanError(err);
  }

  if (data && data.stats && data.stats.errors) {
    data.stats.errors = data.stats.errors.map(cleanError);
  }

  return {
    error: error,
    data: data || null
  };
};

export default processData;