import build from './build';
import hmr from './hmr';
import env from './env';
import cache from './cache';

build.hmr = hmr;
build.env = env;
build.cache = cache;

export default build;
