'use strict';

var build = require('./build');

build.hmr = require('./hmr');
build.builds = require('./builds');

module.exports = build;