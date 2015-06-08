import crypto from 'crypto';
import path from 'path';
import _ from 'lodash';
import packageJson from '../../package';
import defaults from './defaults';

export default (opts) => {
  opts = opts || {};

  opts = _.defaults(opts, defaults);

  if (opts.staticUrl && !_.endsWith(opts.staticUrl, '/')) {
    opts.staticUrl += '/';
  }

  if (opts.publicPath && !_.endsWith(opts.publicPath, '/')) {
    opts.publicPath += '/';
  }

  if (!opts.hash) {
    let serializable = _.omit(opts, _.isObject);
    let json = JSON.stringify(serializable);
    let content = json + packageJson.version;
    opts.hash = crypto.createHash('md5').update(content).digest('hex');
  }

  if (!opts.cacheFile) {
    opts.cacheFile = path.join(opts.cacheDir, `${opts.hash}.json`);
  }

  if (opts.hmrRoot && _.endsWith(opts.hmrRoot, '/')) {
    opts.hmrRoot = opts.hmrRoot.slice(0, -1);
  }

  if (!opts.hmrNamespace) {
    opts.hmrNamespace = `/${opts.hash}`;
  }

  return opts;
};