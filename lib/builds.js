var webpack = require('webpack');

module.exports = {
  development: function(config) {
    config.devtool = 'eval-source-map';

    if (config.output) {
      config.output.pathinfo = true;
    }

    this._plugins(config, false);

    return config;
  },
  production: function(config) {
    config.devtool = 'source-map';

    this._plugins(config, true);

    config.plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin()
    );

    return config;
  },
  _plugins: function(config, production) {
    config.plugins = config.plugins || [];

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(production ? 'production' : 'development')
        }
      }),
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.NoErrorsPlugin()
    );
  }
};