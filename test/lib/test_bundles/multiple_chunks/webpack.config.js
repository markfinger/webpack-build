'use strict';

var path = require('path');

module.exports = function () {
  return {
    context: __dirname,
    entry: {
      one: './entry1.js',
      two: './entry2.js',
      three: './entry3.js'
    },
    output: {
      path: path.join(__dirname, '..', '..', 'test_output', 'multiple_chunks'),
      filename: '[name]-bundle.js'
    }
  };
};
//# sourceMappingURL=webpack.config.js.map