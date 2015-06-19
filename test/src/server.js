import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import build from '../../lib/index';
import Wrapper from '../../lib/wrappers/Wrapper';
import wrappers from '../../lib/wrappers';
import workers from '../../lib/workers';
import caches from '../../lib/caches';
import server from '../../lib/server';
import request from 'request';
import utils from './utils';

let assert = utils.assert;
let TEST_OUTPUT_DIR = utils.TEST_OUTPUT_DIR;

// Ensure we have a clean slate before and after each test
beforeEach(() => {
  wrappers.clear();
  caches.clear();
  workers.killAll();
  utils.cleanTestOutputDir();
});
afterEach(() => {
  wrappers.clear();
  caches.clear();
  workers.killAll();
  utils.cleanTestOutputDir();
});

describe('server', () => {
  it('should accept POST requests and pass them to `build`', (done) => {
    let opts = {
      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
    };
    request('http://127.0.0.1:9009', (err) => {
      assert.instanceOf(err, Error, 'Sanity check to make sure there isn\'t another server running');

      server.listen(9009, () => {
        request.post({
          url: 'http://127.0.0.1:9009/build',
          json: true,
          body: opts
        }, (err, res, body) => {
          assert.isNull(err);
          assert.isObject(body);

          assert.isNull(body.error);
          assert.isObject(body.data);
          assert.equal(body.data.config.file, opts.config);

          server.close();
          done();
        });
      });
    });
  });
  it('should accept GET requests and provide some info', (done) => {
    server.listen(9009, () => {
      request('http://127.0.0.1:9009', (err, res, body) => {
        assert.isNull(err);
        assert.isString(body);

        assert.include(body, '<html>');
        assert.include(body, 'webpack-build-server');

        server.close();
        done();
      });
    });
  });
  it('should handle hmr', (done) => {
    let configFile = path.join(TEST_OUTPUT_DIR, 'test_server_handles_hmr.js');

    mkdirp.sync(TEST_OUTPUT_DIR);

    fs.writeFileSync(configFile, `
      module.exports = require('${path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')}');
    `);

    let opts = {
      config: configFile,
      hmr: true,
      hmrRoot: 'http://example.com',
      publicPath: '/test'
    };

    server.listen(9009, () => {
      request.post({
        url: 'http://127.0.0.1:9009/build',
        json: true,
        body: opts
      }, (err, res, body) => {
        assert.isNull(err);
        assert.isObject(body);

        if (body.error) console.log(JSON.stringify(body.error));
        assert.isNull(body.error);
        assert.isObject(body.data);
        assert.equal(body.data.config.file, opts.config);

        server.close();
        done();
      });
    });
  });
  it('should handle hmr with workers', (done) => {
    let configFile = path.join(TEST_OUTPUT_DIR, 'test_server_handles_hmr_with_workers.js');

    mkdirp.sync(TEST_OUTPUT_DIR);

    fs.writeFileSync(configFile, `
      module.exports = require('${path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')}');
    `);

    let opts = {
      config: configFile,
      hmr: true,
      hmrRoot: 'http://example.com',
      publicPath: '/test'
    };

    workers.spawn(1);

    server.listen(9009, () => {
      request.post({
        url: 'http://127.0.0.1:9009/build',
        json: true,
        body: opts
      }, (err, res, body) => {
        assert.isNull(err);
        assert.isObject(body);

        assert.isNull(body.error);
        assert.isObject(body.data);
        assert.equal(body.data.config.file, opts.config);

        server.close();
        done();
      });
    });
  });
});