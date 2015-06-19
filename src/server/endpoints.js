export default {
  index: (req, res) => {
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
  },
  build: (req, res) => {
    let opts = options(req.body);
    let logger = log('build-server', opts);
    logger(`request received for ${opts.buildHash}`);

    build(opts, (err, data) => {
      res.json(processData(err, data));
    });
  }
};
