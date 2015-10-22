import path from 'path';
import _ from 'lodash';
import webpack from 'webpack';

const hmrConfig = (config, opts) => {
  if (!opts.hmrRoot) {
    throw new Error('hmrRoot must be defined to inject hmr runtime');
  }

  if (!opts.outputPath && (!config.output || !config.output.path)) {
    throw new Error('the output.path prop must be defined in your config or as the outputPath option to inject the hmr runtime');
  }

  if (!opts.publicPath && (!config.output.publicPath || !config.output.publicPath)) {
    throw new Error('the output.publicPath prop must be defined in your config or as the publicPath option to inject the hmr runtime');
  }

  const socketOpts = JSON.stringify({
    root: opts.hmrRoot,
    path: opts.hmrPath,
    namespace: opts.hmrNamespace
  });

  const devClient = [
    `${__dirname}/client?${socketOpts}`,
    'webpack/hot/only-dev-server'
  ];

  config.entry = config.entry || [];

  if (_.isArray(config.entry)) {
    config.entry = devClient.concat(config.entry);
  } else if (_.isObject(config.entry)) {
    _.forEach(config.entry, (value, key) => {
      config.entry[key] = devClient.concat(value);
    });
  } else {
    config.entry = devClient.concat([config.entry]);
  }

  config.plugins = config.plugins || [];

  config.plugins.push(new webpack.HotModuleReplacementPlugin());

  config.output = config.output || {};

  if (opts.publicPath) {
    config.output.publicPath = opts.publicPath;
  }

  let outputPath = opts.outputPath || config.output.path;
  config.recordsPath = path.join(outputPath, `webpack.records-${opts.buildHash}.json`);
};

export default hmrConfig;