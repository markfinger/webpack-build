webpack-build
=============

[![Build Status](https://travis-ci.org/markfinger/webpack-build.svg?branch=master)](https://travis-ci.org/markfinger/webpack-build)
[![Dependency Status](https://david-dm.org/markfinger/webpack-build.svg)](https://david-dm.org/markfinger/webpack-build)
[![devDependency Status](https://david-dm.org/markfinger/webpack-build/dev-status.svg)](https://david-dm.org/markfinger/webpack-build#info=devDependencies)

Wraps webpack. Intended for build systems. Does a bunch of things...

- Runs multiple concurrent compilers
- Persistent caching
- HMR support
- Environment configuration


Documentation
-------------

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Configuration](#configuration)
- [Caching](#caching)
- [Environment configuration](#environment-configuration)
- [HMR](#hmr)
- [Debugging](#debugging)
- [Dev notes](#dev-notes)
- [Colophon](#colophon)


Installation
------------

```bash
npm install webpack-build
```


Basic usage
-----------

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js'
}), function(err, data) {
  console.log(data.output);
});
```

The `data` object includes:

- `stats`: a subset of the compiler's output
- `assets`: a list of absolute paths to all assets generated
- `output`: a map from the entries to absolute paths matching their assets, grouped by
  file type
- `urls`: a map from the entries to urls matching their assets, grouped by file type.
  These values are generated from the `staticRoot` and `staticUrl` options
- `webpackConfig`: the config object generated and passed to webpack


Configuration
-------------

```javascript
{

  // An absolute path to a config file
  config: '/path/to/webpack.config.js',
  
  // Watching
  // --------

  watch: true,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  // -------------------

  env: '', // the env to apply
  outputPath: '', // override for output.path
  publicPath: '', // override for output.publicPath

  // External system integration
  // ---------------------------

  staticRoot: '', // Absolute path to your root static dir
  staticUrl: '', // Url to your root static dir

  // Caching
  // -------

  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_cache'),

  // Hot module replacement
  // ----------------------

  hmr: false, // if true, hmr code is injected
  hmrRoot: '', // The address of the build server
  hmrPath: '/__webpack_hmr__', // the mount point of the socket handler

}
```

Caching
-------

Once your a compilation request has completed successfully, the output is cached and subsequent 
requests will be served from memory until a compiler invalidates it. Cached output is also written 
to disk, so cold boots are pretty fast.

When serving cached data, a compiler is spun up in the background so that the cache only has to
serve data until the compiler has completed. Once the compiler's ready, webpack's incremental 
compilation provides almost instantaneous builds.

To avoid serving stale data, the wrapper tracks file and package dependencies. File timestamps
and package versions are checked whenever cached data is requested. If the cache deems that the 
data is stale, requests will be blocked until the compiler completes.


Environment configuration
-------------------------

You can specify functions in your config file which can be run to generate
environment-specific configuration.

```javascript
module.exports = {
  // ...
  env: {
    dev: function(config, opts) {
      config.devtool = 'eval';

      config.loaders.push({
        // ...
      });

      if (opts.hmr) {
        // ...
      }
    },
    prod: function(config, opts) {
      config.devtool = 'source-map';
    }
  }
};
```

To apply an environment configuration, pass in the `env` option to the wrapper

```javascript
var build = require('webpack-build');

build({
  // ...
  env: 'dev'
}, function(err, stats) {
  // ...
});
```

`env` functions are provided with both your config file's object and your options object you
passed in to build.

The wrapper also comes with some convenience functions that help you to avoid boilerplate.

```javascript
var build = require('webpack-build');

module.exports = {
  // ...
  env: {
    dev: build.env.dev,
    prod: build.env.prod
  }
};
```

`build.env.dev(config, opts)` makes the following changes and additions

```javascript
{
  output: {
    // ...
    pathinfo: true
  },
  devtool: 'eval-source-maps',
  plugins: [
    // ...
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: JSON.stringify('development')}
    })
  ]
}
```

`build.env.prod(config, opts)` makes the following changes and additions

```javascript
{
  devtool: 'source-maps',
  plugins: [
    // ...
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {NODE_ENV: JSON.stringify('production')}
    })
  ]
}
```


HMR
---

webpack-build includes hooks to add HMR functionality

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  hmr: true,
  hmrRoot: 'http://127.0.0.1:8000',
  outputPath: '/path/to/output/dir',
  publicPath: '/static/output/dir',
}, function(err, stats) {
  // ...
});
```

When assets are rendered on the front-end, they open sockets to the build server and
attempt to hot update whenever possible. If hot updates are not possible, console logs
will indicate the need to refresh for updates to be applied.


Debugging
---------

The environment variable DEBUG is respected by the library's logger.

To expose verbose logs to your shell, run your process with `DEBUG=webpack-build:* ...`

The project uses babel for ES5 compatibility. If you want clearer stack traces, turn
on source map support

```
npm install source-map-support
```

```javascript
require('source-map-support').install();
```


Dev notes
---------

### Build the project

```bash
npm run build

# or

npm run build -- --watch
```

### Run the tests

```bash
npm test
```


Colophon
--------

Large portions of this codebase are heavily indebted to
[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) and
[webpack-dev-server](https://github.com/webpack/webpack-dev-server).

This project stands on the shoulders of giants - specifically, Tobias Koppers and the
webpack ecosystem's vast number of contributors.
