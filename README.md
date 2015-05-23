webpack-wrapper
===============

[![Build Status](https://travis-ci.org/markfinger/webpack-wrapper.svg?branch=master)](https://travis-ci.org/markfinger/webpack-wrapper)
[![Dependency Status](https://david-dm.org/markfinger/webpack-wrapper.svg)](https://david-dm.org/markfinger/webpack-wrapper)
[![devDependency Status](https://david-dm.org/markfinger/webpack-wrapper/dev-status.svg)](https://david-dm.org/markfinger/webpack-wrapper#info=devDependencies)

A wrapper around webpack which provides a variety of optimisations and utilities intended to assist
with integrating webpack into a build process.

Typical applications include:
- As part of a request cycle for a development server. If a compiler is watching, the wrapper 
  blocks requests whenever a rebuild is occurring
- As part of a tool chain, ex: [python-webpack](https://github.com/markfinger/python-webpack)
- As a caching layer to speed up your build times
- As an abstraction layer to keep logic out of your config files

Features:
- Support for multiple concurrent compilers
- Change detection for config files
- Toggleable source file watching
- File-based caching of compilation output, which massively reduces the initial build time
- Optimises the background compilation of webpack's watcher by writing assets to memory and 
  emitting them to disk when required
- Pre-processes compiler output so that it can be easily serialized and passed between processes
- Provides a config helper to map the output path to a particular directory, which helps to keep 
  config files portable and easily integrated into larger systems


Installation
------------

```bash
npm install webpack-wrapper
```

Basic usage
-----------

```javascript
var webpack = require('webpack-wrapper');

webpack({
  // An object containing your webpack config, or a string denoting an 
  // absolute path to a config file
  config: '/path/to/webpack.config.js',
  
  // The following options are the default values...
  
  // Indicates that webpack should watch the source files for changes 
  // and rebuild in the background
  watch: false,
  
  // Indicates that the config file should be watched for changes. 
  // Any changes will cause webpack to completely rebuild the bundle
  // on the next request
  watchConfig: false,
  
  // An absolute path to a file that will be used to store compilation 
  // output
  cacheFile: null,
  
  // A delay between the detection of a change in you source files, and 
  // the start of the rebuild process
  aggregateTimeout: 200,
  
  // Indicates if the watcher should poll for changes, rather than 
  // relying on the OS for notifications
  poll: undefined,
  
  // The maximum time that compilation output will be stored for
  cacheTTL: 1000 * 60 * 60 * 24 * 30, // 30 days
  
  // Indicates that webpack's watcher should emit rebuilt files to 
  // memory until they are required to be on disk. If `cacheFile` is
  // defined, this is set to false
  useMemoryFS: true
  
  // An override for the config's `output.path` property
  outputPath: null,
  
  // A console-like object which is written to when the wrapper's state
  // changes, mostly of use for debugging. Set it `null`, to suppress 
  // all output
  logger: console
  
}), function(err, stats) {
  // Besides the usual stats data produced by webpack, the wrapper adds 
  // some extra props...
  
  // The generated config object used by webpack
  stats.webpackConfig
  
  // An object mapping asset names to the full path of the generated asset
  stats.pathsToAssets
});
```

Caching
-------

When a request comes in and the compilation output has been cached from a previous build, the following 
actions are performed:
- the modified time for the config file is compared to the compilation's start time
- the modified time for every file dependency is compared to the compilation's start time

If the modified times are later than the cached compilation's start time - or any of the above actions 
produced errors - the cached output is ignored and the wrapper waits for webpack to recompile.

If the cached output is stale or a watcher has rebuilt the bundle, the file cache will be updated as soon 
as the compilation has completed.
