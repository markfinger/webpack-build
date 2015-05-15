webpack-service
===============

[![Build Status](https://travis-ci.org/markfinger/webpack-wrapper.svg?branch=master)](https://travis-ci.org/markfinger/webpack-wrapper)
markfinger/webpack-service
[![Dependency Status](https://david-dm.org/markfinger/webpack-service.svg)](https://david-dm.org/markfinger/webpack-service)
[![devDependency Status](https://david-dm.org/markfinger/webpack-service/dev-status.svg)](https://david-dm.org/markfinger/webpack-service#info=devDependencies)

A high-level wrapper around webpack which:
- Reuses compiler instances to reduce the overhead on multiple requests.
- Provides optional file watchers to detect changes to both your config and source files
- Pre-processes the compilation output so that it can be easily stored or serialized without having to handle the entire source tree
- Provides a config helper to pre-process your config and map the output path to a particular directory


Installation
------------

```bash
npm install webpack webpack-service
```

Usage
-----

```javascript
var webpackService = require('webpack-service');

webpackService({
  // An absolute path to a webpack config file.
  config: '/path/to/webpack.config.js',
  //
  // ---------------------
  // Default configuration
  // ---------------------
  //
  // Should webpack watch the source files for changes and rebuild in the
  // background
  watch: false,
  // The delay between a change being detected and webpack starting the
  // rebuild process
  watchDelay: 200,
  // Indicates that the config file should be watched for changes. Any changes
  // will cause webpack to start rebuilding the bundle
  watchConfig: false,
  // If defined, a config's `output.path` prop will have "[bundle_dir]" substrings
  // replaced with the value of `bundleDir`
  bundleDir: null,
  // Indicates the watcher should emit rebuilt files to memory until the are required
  useMemoryFS: true
}), function(err, stats) {
  // Besides the usual stats data produced by webpack, the service adds extra props:
  // stats.webpackConfig: the object passed in to webpack
  // stats.pathsToAssets: an object mapping asset names to the full path of the emitted asset
});
```
