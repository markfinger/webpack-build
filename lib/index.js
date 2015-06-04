'use strict';

var build = require('./build');

build.hmr = require('./hmr');
build.env = require('./env');
build.options = require('./options');

module.exports = build;