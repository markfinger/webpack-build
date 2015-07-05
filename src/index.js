import build from './build';
import hmr from './hmr';
import options from './options';
import caches from './caches';
import workers from './workers';

build.hmr = hmr;
build.options = options;
build.caches = caches;
build.workers = workers;

export default build;
