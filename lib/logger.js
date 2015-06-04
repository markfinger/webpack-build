var debug = require('debug');
var packageJson = require('../package');

module.exports = function(name) {
  return debug(packageJson.name + ':' + name);
};
