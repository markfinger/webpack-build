import build from './build';
import hmr from './hmr';
import env from './env';
import options from './options';

build.hmr = hmr;
build.env = env;
build.options = options;

export default build;