webpack-wrapper
===============

[![Build Status](https://travis-ci.org/markfinger/webpack-wrapper.svg?branch=master)](https://travis-ci.org/markfinger/webpack-wrapper)
[![Dependency Status](https://david-dm.org/markfinger/webpack-wrapper.svg)](https://david-dm.org/markfinger/webpack-wrapper)
[![devDependency Status](https://david-dm.org/markfinger/webpack-wrapper/dev-status.svg)](https://david-dm.org/markfinger/webpack-wrapper#info=devDependencies)

A wrapper around webpack which:
- Abstracts away the complexity of handling both watched and non-watched bundles
- Detects changes to your config files and triggers bundle rebuilds
- Processes the compilation output so that it can be easily stored or serialized without having
  to handle the entire source tree
- Provides a config helper to pre-process your config and map the output path to a particular
  directory
- Provides convenience maps from the entry files to the generated file
- Optimises the background compilation of webpack's watcher, by writing assets to memory and emitting
  them to your file system on demand


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
  // Should webpack watch the source files for changes and rebuild in the background
  watch: false,
  // The delay between a change being detected and webpack starting the rebuild process
  watchDelay: 200,
  // Indicates that the config file should be watched for changes. Any changes will cause
  // webpack to completely rebuild the bundle
  watchConfig: false,
  // Indicates that webpack's watcher should emit rebuilt files to memory until the are required
  useMemoryFS: true
  // If defined, a config's `output.path` prop will have "[bundle_dir]" substrings
  // replaced with the value of `bundleDir`
  bundleDir: null,
}), function(err, stats) {
  // Besides the usual stats data produced by webpack, the service adds extra props:
  // stats.webpackConfig: the object passed in to webpack
  // stats.pathsToAssets: an object mapping asset names to the full path of the emitted asset
});
```
