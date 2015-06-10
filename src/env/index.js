import path from 'path';
import webpack from 'webpack';

const improve = (config) => {
  config.plugins = config.plugins || [];

  config.plugins.push(
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoErrorsPlugin()
  );
};

module.exports = {
  dev: (config) => {
    improve(config);

    config.output = config.output || {};

    config.devtool = 'eval-source-map';

    config.output.pathinfo = true;

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('development')
        }
      })
    );
  },
  prod: (config) => {
    improve(config);

    config.devtool = 'source-map';

    config.plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production')
        }
      })
    );
  }
};