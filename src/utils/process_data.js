const processData = (err, data) => {
  // Processes data for communication between processes

  let error = null;
  if (err && err.message) {
    error = {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack
    }
  }

  return {
    error: error,
    data: data || null
  };
};

export default processData;