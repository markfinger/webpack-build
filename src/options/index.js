import crypto from 'crypto';
import path from 'path';
import _ from 'lodash';
import packageJson from '../../package';
import defaults from './defaults';

const options = (opts) => {
  opts = opts || {};

  opts = _.defaults(opts, defaults);

  if (opts.staticUrl && !_.endsWith(opts.staticUrl, '/')) {
    opts.staticUrl += '/';
  }

  if (opts.publicPath && !_.endsWith(opts.publicPath, '/')) {
    opts.publicPath += '/';
  }

  if (opts.hmrRoot && _.endsWith(opts.hmrRoot, '/')) {
    opts.hmrRoot = opts.hmrRoot.slice(0, -1);
  }

  if (!opts.buildHash) {
    let serializedOpts = JSON.stringify(opts);
    opts.buildHash = crypto.createHash('sha1').update(serializedOpts).digest('hex');
  }

  if (!opts.cacheFile) {
    opts.cacheFile = path.join(opts.cacheDir, `${opts.buildHash}.json`);
  }

  if (!opts.hmrNamespace) {
    opts.hmrNamespace = `/${opts.buildHash}`;
  }

  return opts;
};

options.defaults = defaults;

export default options;