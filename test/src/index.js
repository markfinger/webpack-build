import path from 'path';
import sourceMapSupport from 'source-map-support';
import defaults from '../../lib/options/defaults';
import utils from './utils';

sourceMapSupport.install({
  handleUncaughtExceptions: false
});

defaults.cacheDir = path.join(utils.TEST_OUTPUT_DIR, 'test_cache_dir');