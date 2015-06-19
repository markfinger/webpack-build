'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _libOptionsDefaults = require('../../lib/options/defaults');

var _libOptionsDefaults2 = _interopRequireDefault(_libOptionsDefaults);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

_sourceMapSupport2['default'].install({
  handleUncaughtExceptions: false
});

_libOptionsDefaults2['default'].cacheDir = _path2['default'].join(_utils2['default'].TEST_OUTPUT_DIR, 'test_cache_dir');
//# sourceMappingURL=index.js.map