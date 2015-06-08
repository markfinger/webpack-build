import build from './build';
import hmr from './hmr';
import env from './env';

build.hmr = hmr;
build.env = env;

export default build;