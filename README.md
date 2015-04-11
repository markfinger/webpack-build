webpack-service
===============

```
var webpackService = require('webpack-service');

webpackService({
    config: '/path/to/webpack.config.js',
    // defaults
    cache: false
    watchConfig: true,
    watch: true,
    watchDelay: 200
}), function(err, stats) {

});
```