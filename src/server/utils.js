export const processData = (err, data) => {
  let error = null;
  if (err) {
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