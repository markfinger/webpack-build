'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {
  index: function index(req, res) {
    var title = 'webpack-build-server v' + packageJson.version;

    var wrapperList = _.map(wrappers.wrappers, function (wrapper, key) {
      return '<li>' + key + ' &mdash; ' + JSON.stringify(wrapper.opts, null, 2) + '</li>';
    });
    var cacheList = _.map(caches.caches, function (cache, key) {
      return '\n        <li>\n          ' + key + ' &mdash; ' + JSON.stringify(cache, null, 2) + '\n        </li>\n      ';
    });
    res.end('\n      <html>\n      <head>\n        <title>' + title + '</title>\n      </head>\n      <body>\n        <h1>' + title + '</h1>\n        <h2>Default options</h2>\n        <pre>' + JSON.stringify(defaults, null, 2) + '</pre>\n        <h2>Wrappers</h2>\n        <ul>' + wrapperList + '</ul>\n        <h2>Caches</h2>\n        <ul>' + cacheList + '</ul>\n      </body>\n      </html>\n    ');
  },
  build: (function (_build) {
    function build(_x, _x2) {
      return _build.apply(this, arguments);
    }

    build.toString = function () {
      return _build.toString();
    };

    return build;
  })(function (req, res) {
    var opts = options(req.body);
    var logger = log('build-server', opts);
    logger('request received for ' + opts.buildHash);

    build(opts, function (err, data) {
      res.json(processData(err, data));
    });
  })
};
module.exports = exports['default'];
//# sourceMappingURL=endpoints.js.map