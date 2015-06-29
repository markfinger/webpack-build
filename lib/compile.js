'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _options = require('./options');

var _options2 = _interopRequireDefault(_options);

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _wrappers = require('./wrappers');

var _wrappers2 = _interopRequireDefault(_wrappers);

var _utilsCheck_config_file = require('./utils/check_config_file');

var _utilsCheck_config_file2 = _interopRequireDefault(_utilsCheck_config_file);

var compile = function compile(opts, cb) {
  opts = (0, _options2['default'])(opts);

  var logger = (0, _log2['default'])('compile', opts);
  logger('build ' + opts.buildHash + ' requested');

  // Ensure that the imported version of the config file is valid
  logger('checking config file ' + opts.config);
  var configErr = (0, _utilsCheck_config_file2['default'])(opts, cb);
  if (configErr) {
    logger('error encountered when checking config file ' + opts.config, configErr.stack);
    return cb(configErr, null);
  }

  var wrapper = _wrappers2['default'].get(opts);
  wrapper.onceDone(cb);
};

exports.compile = compile;
exports['default'] = compile;
//# sourceMappingURL=compile.js.map