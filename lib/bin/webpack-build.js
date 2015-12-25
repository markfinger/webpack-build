#!/usr/bin/env node


// Ensure source map support as early as possible
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('../utils/source_map_support');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _pathIsAbsolute = require('path-is-absolute');

var _pathIsAbsolute2 = _interopRequireDefault(_pathIsAbsolute);

// used for compatibility

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _2 = require('..');

var _3 = _interopRequireDefault(_2);

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _server = require('../server');

var _server2 = _interopRequireDefault(_server);

var _workers = require('../workers');

var _workers2 = _interopRequireDefault(_workers);

var _optionsDefaults = require('../options/defaults');

var _optionsDefaults2 = _interopRequireDefault(_optionsDefaults);

var _package = require('../../package');

var _package2 = _interopRequireDefault(_package);

var argv = _yargs2['default'].option('c', {
  alias: 'config',
  description: 'A path to a config file',
  'default': 'webpack.config.js'
}).option('d', {
  alias: 'development',
  description: 'Activate development mode',
  'default': false
}).option('p', {
  alias: 'port',
  description: 'Specify the server\'s port',
  'default': 9009
}).option('a', {
  alias: 'address',
  description: 'Specify the server\'s address',
  'default': '127.0.0.1'
}).option('s', {
  alias: 'server',
  description: 'Run a build server',
  'default': false
}).option('hmr', {
  alias: 'hot-module-replacement',
  description: 'Activate hot-module-replacement',
  'default': _options2['default'].defaults.hmr
}).option('pp', {
  alias: 'public-path',
  description: 'Defines the publicPath build option',
  'default': _options2['default'].defaults.publicPath
}).option('w', {
  alias: 'watch',
  description: 'Activates a watching compiler',
  'default': _options2['default'].defaults.watch
}).option('wo', {
  alias: 'workers',
  description: 'Specify the number of workers to use',
  'default': _workers2['default'].defaultWorkers
}).version(function () {
  return _package2['default'].version;
}).alias('v', 'version').help('h').alias('h', 'help').strict().argv;

var config = argv.config;
if (!(0, _pathIsAbsolute2['default'])(config)) {
  config = _path2['default'].join(process.cwd(), config);
}
if (!_fs2['default'].existsSync(config)) {
  config = null;
}

var startupOutput = [];

startupOutput.push(_package2['default'].name + ' v' + _package2['default'].version + '\n');

if (!config && !argv.server) {
  throw new Error('Config file "webpack.config.js" does not exist or the --server argument has not been specified');
}

if (argv.hmr) {
  argv.watch = true;
}

function emitBuildInformation(err, data) {
  if (err) {
    console.error(_chalk2['default'].red(err.stack || err));
  } else {
    console.log(_chalk2['default'].blue('Files emitted:'));
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = data.assets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var asset = _step.value;

        console.log(_chalk2['default'].blue('  ' + asset));
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
  }
}

function buildConfigFile(config) {
  console.log('Building ' + config + '...\n');

  (0, _3['default'])({
    config: config,
    watch: argv.watch,
    context: {
      development: argv.development
    },
    hmr: argv.hmr,
    publicPath: argv.publicPath
  }, emitBuildInformation);
}

var url = 'http://' + argv.address + ':' + argv.port;

if (argv.server || argv.hmr) {
  _optionsDefaults2['default'].hmrRoot = url;

  _workers2['default'].spawn(argv.workers);
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = _workers2['default'].workers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var worker = _step2.value;

      startupOutput.push('Worker #' + worker.worker.id + ' - ' + worker.worker.process.pid);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2['return']) {
        _iterator2['return']();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }
}

function flushStartupOutput() {
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = startupOutput[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var message = _step3.value;

      console.log(message);
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3['return']) {
        _iterator3['return']();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }
}

if (argv.server) {
  _server2['default'].listen(argv.port, argv.address, function () {
    startupOutput.push('\nListening at ' + url + '\n');
    flushStartupOutput();
  });
} else if (argv.hmr) {
  _server2['default'].listen(argv.port, argv.address, function () {
    startupOutput.push('\nListening at ' + url + '\n');
    flushStartupOutput();

    buildConfigFile(config);
  });
} else {
  flushStartupOutput();
  buildConfigFile(config);
}
//# sourceMappingURL=webpack-build.js.map