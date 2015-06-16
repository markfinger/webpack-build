import build from './build';
import hmr from './hmr';
import env from './env';
import caches from './caches';
import workers from './workers';

build.hmr = hmr;
build.env = env;
build.caches = caches;
build.workers = workers;

export default build;
