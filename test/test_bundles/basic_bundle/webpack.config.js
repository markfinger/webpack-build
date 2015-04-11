var path = require('path');

module.exports = {
  context: __dirname,
	entry: './entry.js',
  output: {
    path: path.join(__dirname, '..', '..', 'bundle_test_output', 'basic_bundle'),
    filename: 'output.js'
  }
};