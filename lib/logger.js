var debug = require('debug');
var packageJson = require('../package');

module.exports = function(name, opts) {
  return debug(packageJson.name + ':' + opts.hash.slice(0, 6) + ':' + name);
};
