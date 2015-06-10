import path from 'path';
import _ from 'lodash';
import webpack from 'webpack';
import Watcher from './Watcher';
import options from './options';
import hmr from './hmr';
import hmrConfig from './hmr/config';
import log from './log';
import packageJson from '../package';

class Wrapper {
  constructor(opts, config, cache) {
    this.opts = options(opts);

    this.logger = log('wrapper', this.opts);

    // TODO: remove this, it's mostly legacy in the test suite. Should simply pass the config obj as `opts.config`
    // Convenience hook to pass an object in. You can also define
    // `opts.config` as a path to a file
    this.config = config;

    this.cache = cache;

    // State
    this.watcher = null;

    // Callbacks
    this._onceDone = [];
  }
  getConfig(cb) {
    if (this.config) {
      return cb(null, this.config);
    }

    if (!this.opts.config) {
      return cb(new Error('Wrapper options missing `config` value'));
    }

    this.config = this.opts.config;

    if (_.isString(this.config)) {
      this.logger(`loading config file ${this.opts.config}`);
      try {
        this.config = require(this.config);
      } catch(err) {
        this.config = null;
        return cb(err);
      }
    }

    if (this.config && this.opts.hmr) {
      try {
        hmrConfig(this.config, this.opts);
      } catch(err) {
        return cb(err);
      }
    }

    if (this.opts.outputPath && this.config.output) {
      this.config.output.path = this.opts.outputPath;
    }

    if (this.config && this.config.env && this.opts.env in this.config.env) {
      this.logger(`applying env "${this.opts.env}"`);
      let env = this.config.env[this.opts.env];
      try {
        env(this.config, this.opts);
      } catch(err) {
        return cb(err);
      }
    }

    cb(null, this.config)
  }
  getCompiler(cb) {
    this.getConfig((err, config) => {
      if (err) return cb(err);

      let compiler = webpack(config);

      compiler.plugin('done', (stats) => {
        if (stats.hasErrors()) {
          this.logger('build error(s)', _.pluck(stats.compilation.errors, 'stack'));
        }
      });

      if (this.opts.config && this.cache) {
        compiler.plugin('done', (stats) => {
          // TODO: get startTime/endTime from the stats
          if (stats.hasErrors()) {
            this.cache.set(null);
          } else {
            this.cache.set(
              this.generateOutput(stats),
              this.opts.watch
            );
          }
        });
      }

      if (this.opts.watch && this.opts.hmr && this.opts.hmrRoot) {
        hmr.bindCompiler(compiler, this.opts);
      }

      cb(null, compiler);
    });
  }
  compile(cb) {
    this.getCompiler((err, compiler) => {
      if (err) return cb(err);

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

    let data = {
      startTime: stats.startTime,
      endTime: stats.endTime,
      stats: stats.toJson({
        modules: false,
        source: false
      }),
      fileDependencies: stats.compilation.fileDependencies,
      dependencies: {
        webpack: require('webpack/package').version,
        'webpack-build': packageJson.version
      },
      config: this.opts.config,
      hash: this.opts.hash,
      pathsToAssets: _.transform(
        stats.compilation.assets,
        (result, obj, asset) => result[asset] = obj.existsAt,
        {} // TODO: can probably remove this line
      ),
      urlsToAssets: {},
      rendered: {
        script: [],
        link: []
      },
      output: _.transform(stats.compilation.chunks, (result, chunk) => {
        var output = {
          js: [],
          css: [],
          files: []
        };
        chunk.files.forEach((filename) => {
          filename = path.join(stats.compilation.outputOptions.path, filename);
          let ext = path.extname(filename);
          if (ext === '.js') {
            output.js.push(filename);
          } else if (ext === '.css') {
            output.css.push(filename);
          } else {
            output.files.push(filename);
          }
        });
        result[chunk.name] = output;
      }, {}),
      buildOptions: this.opts
    };

    if (this.opts.staticRoot && this.opts.staticUrl) {
      _.forEach(data.pathsToAssets, (absPath, asset) => {
        let relPath = absPath.replace(this.opts.staticRoot, '');

        let relUrl = relPath.split(path.sep).join('/');
        if (_.startsWith(relUrl, '/')) {
          relUrl = relUrl.slice(1);
        }

        let url = this.opts.staticUrl + relUrl;
        data.urlsToAssets[asset] = url;

        if (path.extname(relPath) === '.css') {
          data.rendered.link.push(`<link rel="stylesheet" href="${url}">`);
        } else if (path.extname(relPath) === '.js') {
          data.rendered.script.push(`<script src="${url}"></script>`);
        }
      });
    }

    if (this.config) {
      data.webpackConfig = this.config;
    } else if (this.opts.config) {
      try {
        data.webpackConfig = require(this.opts.config);
      } catch(err) {}
    }

    return data;
  }
  handleErrAndStats(err, stats, cb) {
    if (err) {
      return cb(err);
    }

    if (stats.hasErrors()) {
      err = _.first(stats.compilation.errors);
    }

    cb(err, this.generateOutput(stats));
  }
  getWatcher(cb) {
    if (this.watcher) {
      return cb(null, this.watcher);
    }

    this.getCompiler((err, compiler) => {
      if (err) return cb(err);

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
        if (err) return cb(err, stats);

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

    _onceDone.forEach(
      (cb) => cb(err, stats)
    );
  }
}

export default Wrapper;