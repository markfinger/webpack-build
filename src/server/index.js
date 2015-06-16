import http from 'http';
import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import build from '../build';
import defaults from '../options/defaults';
import caches from '../caches/caches';
import wrappers from '../wrappers';
import options from '../options';
import log from '../log';
import packageJson from '../../package';
import processData from '../utils/process_data';
import hmr from '../hmr';

let app = express();
let server = http.Server(app);

app.use(bodyParser.json());

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
  logger(`request received for ${opts.buildHash}`);

  build(opts, (err, data) => {
    try {
      res.json(processData(err, data));
    } catch(_err) {
      debugger
    }
  });
});

hmr.addToServer(server);

export default server;