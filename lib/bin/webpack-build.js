'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _server = require('../server');

var _server2 = _interopRequireDefault(_server);

var _workers = require('../workers');

var _workers2 = _interopRequireDefault(_workers);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

_sourceMapSupport2['default'].install({
  handleUncaughtExceptions: false
});

var argv = _yargs2['default'].option('p', {
  alias: 'port',
  description: 'Specify the server\'s port',
  'default': 9009
}).option('a', {
  alias: 'address',
  description: 'Specify the server\'s address',
  'default': '127.0.0.1'
}).option('w', {
  alias: 'workers',
  description: 'Specifies the number of workers to use'
}).version(function () {
  return _package2['default'].version;
}).alias('v', 'version').help('h').alias('h', 'help').strict().argv;

var url = 'http://' + argv.address + ':' + argv.port;
_optionsDefaults2['default'].hmrRoot = url;

_workers2['default'].spawn(argv.workers);

console.log('' + _package2['default'].name + ' v' + _package2['default'].version + '\n');

var _iteratorNormalCompletion = true;
var _didIteratorError = false;
var _iteratorError = undefined;

try {
  for (var _iterator = _workers2['default'].workers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
    var worker = _step.value;

    console.log('Worker #' + worker.worker.id + ' - ' + worker.worker.process.pid);
  }
} catch (err) {
  _didIteratorError = true;
  _iteratorError = err;
} finally {
  try {
    if (!_iteratorNormalCompletion && _iterator['return']) {
      _iterator['return']();
    }
  } finally {
    if (_didIteratorError) {
      throw _iteratorError;
    }
  }
}

_server2['default'].listen(argv.port, argv.address, function () {
  console.log('\nListening at ' + url + '\n');
});
//# sourceMappingURL=webpack-build.js.map