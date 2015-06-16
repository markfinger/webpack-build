import build from './build';
import hmr from './hmr';
import env from './env';
import caches from './caches';

build.hmr = hmr;
build.env = env;
build.caches = caches;

export default build;
