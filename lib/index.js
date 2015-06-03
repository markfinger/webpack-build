'use strict';

var build = require('./build');

build.hmr = require('./hmr');
build.env = require('./env');

module.exports = build;