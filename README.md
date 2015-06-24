webpack-build
=============

[![Build Status](https://travis-ci.org/markfinger/webpack-build.svg?branch=master)](https://travis-ci.org/markfinger/webpack-build)
[![Dependency Status](https://david-dm.org/markfinger/webpack-build.svg)](https://david-dm.org/markfinger/webpack-build)
[![devDependency Status](https://david-dm.org/markfinger/webpack-build/dev-status.svg)](https://david-dm.org/markfinger/webpack-build#info=devDependencies)

Wraps webpack. Does some useful stuff...

- Multiple concurrent compilers across multiple workers
- Persistent caching
- Build server
- HMR support
- Configuration hooks


Documentation
-------------

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Config files](#config-files)
- [Build configuration](#build-configuration)
- [Caching](#caching)
- [Workers](#workers)
- [Build server](#build-server)
- [HMR](#hmr)
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
  config: '/path/to/webpack.config.js',
  watch: true
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

Whenever you need the latest output from the compiler, just call `build` with the same options.


Config files
------------

webpack-build uses config factories to generate the webpack config objects. Using factories enables easier
environment configuration, avoids a number of issues relating to the mutability of JS objects, and makes it
easier to create templates.

A config file should export a function that will return an object.

```javascript
module.exports = function(opts) {
  var config = {
    entry: '...',
    output: {
      // ..
    },
    loaders: [
      // ...
    ]
  };

  if (opts.hmr) {
    config.loaders.push({
      // ...
    });

    config.devtool = '...';
  } else {
    config.loaders.push({
      // ...
    });

    config.devtool = '...';
  }

  return config;
};
```

The `opts` argument is an extended version of the options object sent to the `build` function. If you want to
pass extra context in to the function, just annotate the options object.

```javascript
build({
  // ...
  context: {
    DEBUG: true
  }
}, function(err, data) {
  // ...
});
```

Your function can then pick up your context

```javascript
module.exports = function(opts) {
  var config = {
    // ...
  };

  if (opts.context.DEBUG) {
    config.devtool = '...';
  }

  return config;
};
```


Build configuration
-------------------

```javascript
{

  // An absolute path to a config file
  config: '/path/to/webpack.config.js',

  // Watching
  // --------

  watch: false,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  // -------------------

  outputPath: '', // override for output.path
  publicPath: '', // override for output.publicPath

  // External system integration
  // ---------------------------

  staticRoot: '', // Absolute path to your static root
  staticUrl: '', // Url to your staticRoot

  // Caching
  // -------

  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_build_cache'),

  // Hot module replacement
  // ----------------------

  hmr: false, // if true, hmr code is injected into the assets
  hmrRoot: '', // The address of the server hosting hmr sockets
  hmrPath: '/__hmr__', // the path to the hmr socket endpoint

}
```


Caching
-------

Once your a compilation request has completed successfully, the output is cached and subsequent 
requests will be served from memory until a compiler invalidates it. To avoid webpack's slow startup,
cached output is also written to disk.

The cache tracks file dependencies, package dependencies, and the emitted assets. Whenever cached 
data is available, the following checks occur before serving it:

- The config file's timestamp is checked against the cached output's start time
- Each file dependency's timestamp is checked against the cached output's start time
- webpack and webpack-build versions are checked against the versions used to populate the cache
- The emitted assets are checked for existence

If any of the checks fail, requests are handed off to a compiler which will repopulate the cache
on completion.

If `watch` is set to true and cached data is available, requests will still cause a compiler to be 
spawned in the background. Spawning the compiler early enables webpack's incremental compilation to
provide fast rebuilds.


Workers
-------

Worker processes allow the main process to remain responsive under heavy load. Some of the more popular 
compilation tools - postcss and babel, for example - will evaluate synchronously and can easily lock 
up a process. To ensure that the main process remains responsive, worker processes can be spawned to 
handle compilation. When workers are available, the main process only handles caching and hmr.

To spawn workers, call `build.workers.spawn()` before sending your build request in.

```javascript
var build = require('webpack-build');

build.workers.spawn();
```

By default, 2 worker processes will be spawned. If you want to spawn more, pass a number in which indicates 
how many you want.

```javascript
var os = require('os');
var build = require('webpack-build');

// Spawn a worker for every CPU core available
build.workers.spawn(os.cpus().length);
```

Fresh requests are parcelled out to workers in sequential order. Repeated requests (for example, to 
get the latest state of a watched bundle) will be mapped to the worker that first handled the request.


Build server
------------

A build server is available via a CLI interface, `node_modules/.bin/webpack-build`. Run the binary and connect
via the network to request builds.

The following optional arguments are accepted:

- `-a` or `--address` the address to listen at, defaults to `127.0.0.1`
- `-p` or `--port` the port to listen at, defaults to `9009`
- `-w` or `--workers` the number of workers to use

Incoming HTTP requests are routed via:

- `GET: /` responds with a HTML document listing the server's state
- `POST: /build` reads in options as JSON, pipes it to the `build` function and responds with JSON

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


HMR
---

webpack-build includes HMR functionality comparable to webpack-dev-server. A key difference is that it 
namespaces the HMR sockets per build, so multiple builds can be used on a single page.

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  hmr: true
}, function(err, data) {
  // ...
});
```

When assets are rendered on the front-end, they open sockets to the build server and attempt to hot 
update whenever possible. If hot updates are not possible, console logs will indicate the need to 
refresh for updates to be applied.

If you are using your own server to expose HMR, you'll need to specify the `hmrRoot` option with the 
address of your server, eg: `hmrRoot: 'http://127.0.0.1:9009'`.

To add the hmr socket handler to an express server

```javascript
var http = require('http');
var express = require('express');
var build = require('webpack-build');

var app = express();
var server = http.Server(app);
build.hmr.addToServer(server);
```


Debugging
---------

The environment variable DEBUG is respected by the library's logger. To expose verbose logs to your 
shell, prepend `DEBUG=webpack-build:*` to your shell command. Ex: `DEBUG=webpack-build:* npm test`

The project uses babel for ES5 compatibility. If you're using the API and want clearer stack traces, 
turn on source map support:

```
npm install source-map-support --save
```

```javascript
sourceMapSupport.install({
  handleUncaughtExceptions: false
});
```


Dev notes
---------

### Build the project

```
npm run build

# or, to continually rebuild

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
