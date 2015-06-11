import path from 'path';

export default {
  config: '',

  // Watching
  watch: true,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  env: '',
  outputPath: '',
  publicPath: '',

  // External system integration
  staticRoot: '',
  staticUrl: '',

  // Caching
  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_cache'),

  // Hot module replacement
  hmr: false,
  hmrRoot: '',
  hmrPath: '/__hmr__',

  // Dynamically created props
  buildHash: '',
  cacheFile: '',
  hmrNamespace: ''
};
