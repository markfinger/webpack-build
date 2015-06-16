import http from 'http';
import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import build from '../build';
import defaults from '../options/defaults';
import caches from '../cache/caches';
import wrappers from '../wrappers';
import options from '../options';
import log from '../log';
import packageJson from '../../package';
import cache from '../cache';
import processData from '../utils/process_data';
import workers from '../workers';
import hmr from '../hmr';

let app = express();
let server = http.Server(app);

app.use(bodyParser.json());
app.use(middleware);

app.get('/', (req, res) => {
  let title = `webpack-build-server v${packageJson.version}`;

  let wrapperList = _.map(wrappers.wrappers, (wrapper, key) => {
    return `<li>${key} &mdash; ${JSON.stringify(wrapper.opts, null, 2)}</li>`;
  });
  let cacheList = _.map(caches.caches, (cache, key) => {
    return `
    <li>
      ${key} &mdash; ${JSON.stringify(cache, null, 2)}
    </li>
    `;
  });
  res.end(`
  <html>
  <head>
    <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    <h2>Default options</h2>
    <pre>${JSON.stringify(defaults, null, 2)}</pre>
    <h2>Wrappers</h2>
    <ul>${wrapperList}</ul>
    <h2>Caches</h2>
    <ul>${cacheList}</ul>
  </body>
  </html>
  `);
});

app.post('/', (req, res) => {
  let opts = options(req.body);
  let logger = log('build-server', opts);

  let workerOpts = _.cloneDeep(opts);
  workerOpts.cache = false;

  // TODO fix hmr
  // TODO prevent workers from accessing the cache

  let emit = (err, data) => {
    if (err) {
      logger('error encountered during build', err);
      return res.status(500).end(err.stack);
    } else {
      logger('serving data from build');
      return res.json(data);
    }
  };

  logger('checking cache');
  cache.get(opts, (err, cachedData) => {
    if (err) {
      logger(`cache error: ${err}`);
    }

    if (cachedData) {
      logger('cached data received');
      emit(null, processData(null, cachedData));
    } else {
      logger('cache has no matching data or has delegated, calling worker');
    }

    if (!cachedData || opts.watch) {
      logger('submitting build request to worker');
      send(workerOpts, (err, data) => {
        logger('populating cache');
        if (err) logger(`worker error: ${err}`);

        if (data) {
          let {error: buildError, data: buildData} = data;

          if (buildError) {
            logger(`worker build error: ${buildError}`);
            cache.set(opts, null);
          } else {
            cache.set(opts, buildData, opts.watch);
          }
        }

        if (!cachedData) {
          emit(err, data);
        }
      });
    }
  });
});

hmr.addToServer(server);

export default server;