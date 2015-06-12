import _ from 'lodash';
import build from '../build';
import defaults from '../options/defaults';
import caches from '../cache/caches';
import wrappers from '../wrappers';
import options from '../options';
import log from '../log';
import packageJson from '../../package';

export const index = (req, res) => {
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
};

export const buildRequest = (req, res) => {
  let opts = options(req.body);
  build(opts, (err, data) => {
    if (err) {
      log('build-server', opts)('build request produced an error', err.stack);
    }

    let error = null;
    if (err) {
      error = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
      }
    }

    res.json({
      error: error,
      data: data || null
    });
  })
};
