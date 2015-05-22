webpack-wrapper
===============

[![Build Status](https://travis-ci.org/markfinger/webpack-wrapper.svg?branch=master)](https://travis-ci.org/markfinger/webpack-wrapper)
[![Dependency Status](https://david-dm.org/markfinger/webpack-wrapper.svg)](https://david-dm.org/markfinger/webpack-wrapper)
[![devDependency Status](https://david-dm.org/markfinger/webpack-wrapper/dev-status.svg)](https://david-dm.org/markfinger/webpack-wrapper#info=devDependencies)

A wrapper around webpack's API which provides a simple interface with a variety of optimisations
and utilities typically required for a build process.

Features:
- Change detection for your config files
- Toggleable source file watching
- File-based caching of compilation output, which massively reduces the initial build time
- Optimises the background compilation of webpack's watcher by initially writing assets 
  to memory and emitting them to disk only when required
- Pre-processes the compilation output so that it can be easily serialized and passed between processes
- Provides a config helper to map your bundle's output path to a particular directory
- Directly exposes paths from the entry files to the generated assets


Installation
------------

```bash
npm install webpack webpack-wrapper
```

Usage
-----

```javascript
var webpack = require('webpack-wrapper');

webpack({
  // An absolute path to a webpack config file.
  config: '/path/to/webpack.config.js',
  
  // The following options are the default values...
  
  // Indicates that webpack should watch the source files for changes 
  // and rebuild in the background
  watch: false,
  
  // The delay between a change being detected and webpack starting 
  // the rebuild process
  aggregateTimeout: 200,
  
  // Indicates if the watcher should poll for changes, rather than 
  // relying on the OS for notifications
  poll: undefined,
  
  // Indicates that the config file should be watched for changes. 
  // Any changes will cause webpack to completely rebuild the bundle
  watchConfig: false,
  
  // An absolute path to a file that will be used to store compilation 
  // output
  cacheFile: null,
  
  // The maximum time that compilation output will be stored for
  cacheTTL: 1000 * 60 * 60 * 24 * 30, // 30 days
  
  // Indicates that webpack's watcher should emit rebuilt files to 
  // memory until they are required to be on disk
  useMemoryFS: true
  
  // If defined, a config's `output.path` prop will have any
  // `[bundle_dir]` substrings replaced with the value of `bundleDir`
  bundleDir: null,
  
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
actions will be performed:
- the modified time for the config file is compared to the compilation's start time
- the modified time for every file dependency is compared to the compilation's start time

If the modified times are later than the cached compilation's start time - or any of the above actions 
produced errors - the cached output is ignored and the wrapper waits for webpack to recompile.

If the cached output is stale or a watcher has rebuilt the bundle, the cache will be updated as soon 
as the compilation has completed.
