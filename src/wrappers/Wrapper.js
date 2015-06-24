import path from 'path';
import _ from 'lodash';
import webpack from 'webpack';
import packageJson from '../../package';
import options from '../options';
import hmr from '../hmr';
import hmrConfig from '../hmr/config';
import log from '../log';
import caches from '../caches';
import Watcher from './Watcher';

class Wrapper {
  constructor(opts, config) {
    this.opts = options(opts);

    this.logger = log('wrapper', this.opts);

    // TODO: remove this, in favour of `opts.config`
    // Convenience hook to pass an object in. Mostly of convenience in the
    // test suite
    this.config = config;

    // State
    this.watcher = null;

    // Callbacks
    this._onceDone = [];
  }
  getConfig(cb) {
    this.logger('fetching config object');

    if (this.config) {
      return cb(null, this.config);
    }

    if (!this.opts.config) {
      return cb(new Error('Wrapper options missing `config` value'));
    }

    let factory;

    if (_.isString(this.opts.config)) {
      this.logger(`loading config file ${this.opts.config}`);
      try {
        factory = require(this.opts.config);
      } catch(err) {
        return cb(err);
      }

      if (!_.isFunction(factory)) {
        return cb(new Error(`File ${this.opts.config} does not export a function`));
      }
    } else {
      factory = this.opts.config;

      if (!_.isFunction(factory)) {
        return cb(new Error(`Config option is not a function`));
      }
    }

    try {
      this.config = factory(this.opts);
    } catch(err) {
      return cb(err);
    }

    if (!this.config || !_.isObject(this.config)) {
      if (_.isString(this.opts.config)) {
        return cb(new Error(`The factory exported by ${this.opts.config} did not return an object`));
      }
      return cb(new Error('The config factory does not return an object'));
    }

    if (this.opts.hmr) {
      try {
        hmrConfig(this.config, this.opts);
      } catch(err) {
        return cb(err);
      }
    }

    if (this.opts.outputPath && this.config.output) {
      this.config.output.path = this.opts.outputPath;
    }

    cb(null, this.config)
  }
  getCompiler(cb) {
    this.logger('creating compiler');
    this.getConfig((err, config) => {
      if (err) return cb(err);

      let compiler = webpack(config);

      this.logger('adding cache hooks to compiler');
      compiler.plugin('done', (stats) => {
        if (stats.hasErrors()) {
          this.logger('build error(s)...');
          for (let err of stats.compilation.errors) {
            this.logger(`... => ${err.stack}`);
          }
          caches.set(this.opts, null);
        } else {
          caches.set(this.opts, this.generateOutput(stats));
        }
      });

      if (this.opts.watch && this.opts.hmr && this.opts.hmrRoot) {
        this.logger('adding hmr hooks to compiler');

        hmr.register(this.opts);

        compiler.plugin('done', (stats) => {
          this.logger('emitting done signal to hmr');

          hmr.emitDone(this.opts, stats);
        });

        compiler.plugin('invalid', () => {
          this.logger('emitting invalid signal to hmr');

          hmr.emitInvalid(this.opts);
        });
      }

      cb(null, compiler);
    });
  }
  compile(cb) {
    this.getCompiler((err, compiler) => {
      if (err) return cb(err);

      this.logger('starting compiler');
      compiler.run((err, stats) => {
        if (!err && stats.hasErrors()) {
          err = _.first(stats.compilation.errors);
        }

        this.logger('compiler completed');
        this.handleErrAndStats(err, stats, cb);
      });
    });
  }
  generateOutput(stats) {
    if (!stats) return null;

    this.logger('generating output object');

    let dependencies = {
      webpack: require('webpack/package').version,
      'webpack-build': packageJson.version
    };

    let statsJson = stats.toJson({
      modules: false,
      source: false
    });

    let assets = _.pluck(stats.compilation.assets, 'existsAt');

    let output = _.transform(stats.compilation.chunks, (result, chunk) => {
      let obj = {
        js: [],
        css: [],
        files: []
      };

      chunk.files.forEach((filename) => {
        filename = path.join(stats.compilation.outputOptions.path, filename);
        let ext = path.extname(filename);
        if (ext === '.js') {
          obj.js.push(filename);
        } else if (ext === '.css') {
          obj.css.push(filename);
        } else {
          obj.files.push(filename);
        }
      });

      result[chunk.name] = obj;
    }, {});

    let urls = {};
    if (this.opts.staticRoot && this.opts.staticUrl) {
      let absPathToRelUrl = (absPath) => {
        let relPath = absPath.replace(this.opts.staticRoot, '');

        let relUrl = relPath.split(path.sep).join('/');
        if (_.startsWith(relUrl, '/')) {
          relUrl = relUrl.slice(1);
        }

        return this.opts.staticUrl + relUrl;
      };

      urls = _.transform(output, (result, group, chunkName) => {
        return result[chunkName] = _.mapValues(group, (paths) => paths.map(absPathToRelUrl));
      });
    }

    return {
      startTime: stats.startTime,
      endTime: stats.endTime,
      config: {
        file: this.opts.config
      },
      buildHash: this.opts.buildHash,
      buildOptions: this.opts,
      outputOptions: stats.compilation.outputOptions,
      assets: assets,
      output: output,
      urls: urls,
      stats: statsJson,
      fileDependencies: stats.compilation.fileDependencies,
      dependencies: dependencies
    };
  }
  handleErrAndStats(err, stats, cb) {
    if (err) {
      return cb(err, stats && this.generateOutput(stats));
    }

    if (stats.hasErrors()) {
      err = _.first(stats.compilation.errors);
    }

    cb(err, this.generateOutput(stats));
  }
  getWatcher(cb) {
    this.logger('fetching watcher');

    if (this.watcher) {
      return cb(null, this.watcher);
    }

    this.getCompiler((err, compiler) => {
      if (err) return cb(err);

      this.logger('creating watcher');

      try {
        this.watcher = new Watcher(compiler, this.opts);
      } catch(err) {
        return cb(err);
      }

      if (this.opts.config) {
        this.watcher.onInvalid(() => {
          this.logger('watcher detected a change');
        });
      }

      this.watcher.onFailure((err) => {
        this.logger('watcher failed', err.stack);
      });

      cb(null, this.watcher);
    });
  }
  onceWatcherDone(cb) {
    this.getWatcher((err, watcher) => {
      if (err) return cb(err);

      watcher.onceDone((err, stats) => {
        this.logger('watcher provided current build output');
        this.handleErrAndStats(err, stats, cb);
      });
    });
  }
  onceDone(cb) {
    this._onceDone.push(cb);

    this.logger('build requested');

    if (this.opts.watch) {
      if (this._onceDone.length === 1) {
        this.onceWatcherDone(this.callDone.bind(this));
      }
    } else {
      this.compile(this.callDone.bind(this));
    }
  }
  callDone(err, stats) {
    let _onceDone = this._onceDone;
    this._onceDone = [];

    _onceDone.forEach(cb => cb(err, stats));
  }
}

export default Wrapper;