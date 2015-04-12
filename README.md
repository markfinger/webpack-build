webpack-service
===============

[![Build Status](https://travis-ci.org/markfinger/webpack-service.svg?branch=master)](https://travis-ci.org/markfinger/webpack-service)

```javascript
webpackService({
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
  // Indicates that the compiled output should be cached. Ignored if the bundle
  // is being watched
  cache: false,
  // Indicates that full output of webpack's compilation data should be returned
  fullStats: false,
  // If defined, a config's `output.path` prop will have [bundle_dir] tokens
  // replaced with the value of `bundleDir`
  bundleDir: null
}), function(err, stats) {
  // Besides the usual stats data produced by webpack, the service adds extra props:
  // stats.webpackConfig: the object passed in to webpack
  // stats.pathsToAssets: an object mapping asset names to the full path of the emitted asset
});
```

Installation
------------

```bash
npm install webpack-service
```
