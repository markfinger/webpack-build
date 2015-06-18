webpack-build
=============

[![Build Status](https://travis-ci.org/markfinger/webpack-build.svg?branch=master)](https://travis-ci.org/markfinger/webpack-build)
[![Dependency Status](https://david-dm.org/markfinger/webpack-build.svg)](https://david-dm.org/markfinger/webpack-build)
[![devDependency Status](https://david-dm.org/markfinger/webpack-build/dev-status.svg)](https://david-dm.org/markfinger/webpack-build#info=devDependencies)

Wraps webpack for asset pipelines and tool chains. Does a bunch of things...

- Persistent caching
- HMR support
- Compiler workers
- Environment config hooks


Documentation
-------------

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Configuration](#configuration)
- [Caching](#caching)
- [Workers](#workers)
- [Env config](#env-config)
- [Env utils](#env-utils)
- [HMR](#hmr)
- [Build server](#build-server)
- [Debugging](#debugging)
- [Dev notes](#dev-notes)
- [Colophon](#colophon)


Installation
------------

```
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
- `outputOptions`: the compiler's output options


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

  hmr: false, // if true, hmr code is injected into the assets
  hmrRoot: '', // The address of the server hosting hmr sockets
  hmrPath: '/__hmr__', // the path to the hmr socket endpoint

}
```


Caching
-------

Succesful compilations have their output cached in memory and persisted to disk. If a compiler 
invalidates the compilation, subsequent requests will block until it completes.

To avoid serving stale data, the cache tracks file dependencies, package dependencies, and the
emitted assets. Whenever cached data is available, the following checks occur before serving it:

- The config file's timestamp is checked against the cached output's start time
- Each file dependency's timestamp is checked against the cached output's start time
- webpack and webpack-build versions are checked against the versions used to populate the cache
- The emitted assets listed in the cache are checked for existence

If any of the checks fail, requests are handed off to a compiler which will repopulate the cache
on completion.

When serving cached data, a compiler is spun up in the background so that the cache only has to
serve data until the compiler has completed. Once the compiler's ready, webpack's incremental 
compilation provides fast rebuilds.


Workers
-------

Worker processes allow the main process to remain responsive under heavy load. Some of the more popular 
compilation tools - postcss and babel, for example - will evaluate synchronously and can easily lock 
up a process. To ensure that the main process remains responsive, worker process can be spawned to 
perform compilation. Using workers ensures that the main process is left free to handle caching and hmr.

To spawn a worker process, call `build.workers.spawn()` before sending your build request in.

```javascript
var build = require('webpack-build');

build.workers.spawn();
```

If you want to spawn multiple workers, `spawn` accepts a number indicating the number of processes 
to spawn.

```javascript
var build = require('webpack-build');

build.workers.spawn(4);
```

Fresh requests are parcelled out to workers in sequential order. Repeated requests (for example, to 
get the latest state of a watched bundle) will be mapped to the worker that first handled the request.


Env config
----------

Using different config files for particular environments can make it difficult to reason about a build. 
To enable a config file to be a canonical indicator of the expected output, you can specify functions in 
your config file which can be run to change the config object.

```javascript
var loaders = [
  // ...
];

module.exports = {
  entry: '...',
  output: {
    // ..
  },
  env: {
    dev: function(config, opts) {
      config.devtool = 'eval';

      config.loaders = loaders.concat([{
        // ...
      }]);

      if (opts.hmr) {
        // ...
      }
    },
    prod: function(config, opts) {
      config.devtool = 'source-map';
      
      config.loaders = loaders.concat([{
        // ...
      }]);
    }
  }
};
```

To apply a particular env function, pass in the `env` option to the wrapper

```javascript
build({
  // ...
  env: 'dev'
}, function(err, data) {
  // ...
});
```

`env` functions are provided with both your config file's object and the options object that you
passed in to `build`.

Note: JS's mutable objects make it easy to trip up when changing from one env to another. Try to compose
the objects functionally to avoid side-effects.


Environment configuration utils
-------------------------------

The following functions help to avoid boilerplate.

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

webpack-build includes HMR functionality comparable to webpack-dev-server. A key difference is that it 
namespaces the hmr sockets per build, so multiple builds can be used on a single page.

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  hmr: true
}, function(err, data) {
  // ...
});
```

When assets are rendered on the front-end, they open sockets to the build server and
attempt to hot update whenever possible. If hot updates are not possible, console logs
will indicate the need to refresh for updates to be applied.

If you are using your own server to expose hmr, you'll need to specify the `hmrRoot` option
with the address of your server, eg: `hmrRoot: 'http://127.0.0.1:9009'`. You can add the
hmr socket handler to your server by calling `build.hmr.addToServer(yourHttpServer)`.


Build server
------------

A build server is available via a CLI interface, `webpack-build`. Run the binary and connect
via the network to request builds. The build server is pre-configured to support HMR.

```
webpack-build

// or

node_modules/.bin/webpack-build
```

The following arguments are accepted:

- `-a` or `--address` the address to listen at, defaults to `127.0.0.1`
- `-p` or `--port` the port to listen at, defaults to `9009`
- `-w` or `--workers` the number of workers to use, defaults to 1

Incoming requests are mapped by their method:

- `GET` responds with a HTML document listing the server's state
- `POST` reads in a JSON body, pipes it to the `build` function and responds with a JSON
  representation of the function's output.

Successful build requests receive

```javascript
{
  "error": null,
  "data": {
    // ..
  }
}
```

Unsuccessful build requests receive

```javascript
{
  "error": {
    // ...
  },
  "data": null
}
```

Depending on how far the request passed through the build process, the response may or may
not have a non-null value for `data`. If the error was produced by the compiler, there may
be multiple errors within `data.stats.errors` and multiple warnings in `data.stats.warnings`.


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

```
npm run build

# or

npm run build -- --watch
```

### Run the tests

```
npm test
```


Colophon
--------

Large portions of this codebase are heavily indebted to
[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) and
[webpack-dev-server](https://github.com/webpack/webpack-dev-server).

This project stands on the shoulders of giants - specifically, Tobias Koppers and the
webpack ecosystem's vast number of contributors.
