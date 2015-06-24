import path from 'path';

export default {
  config: '',

  // Watching
  watch: false,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  outputPath: '',
  publicPath: '',

  // External system integration
  staticRoot: '',
  staticUrl: '',

  // Caching
  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_build_cache'),

  // Hot module replacement
  hmr: false,
  hmrRoot: '',
  hmrPath: '/__hmr__',

  // Dynamically created props
  buildHash: '',
  cacheFile: '',
  hmrNamespace: ''
};
