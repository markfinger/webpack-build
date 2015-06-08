import http from 'http';
import express from 'express';
import winston from 'winston';
import hmr from '../hmr';
import build from '..';

class Server {
  constructor(opts) {
    opts = opts || {};

    this.app = express();
    this.server = http.Server(this.app);

    this.root = opts.root || process.cwd();

    hmr.addTo(this.server);

    this.logger = new winston.Logger({
      transports: [
        new winston.transports.Console({
          colorize: true,
          timestamp: function () {
            let time = new Date();

            let ms = time.getMilliseconds();
            if (ms < 10) {
              ms = `00${ms}`;
            } else if (ms < 100) {
              ms = `0${ms}`;
            }

            return `${time.getHours()}:${time.getMinutes()}:${ms}`;
          },
          prettyPrint: true,
          showLevel: true
        })
      ],
      exitOnError: false
    });

    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.url}`);

      next();
    });

    this.app.get('/build', (req, res, next) => {
      // TODO: map query args to `build` options
    });
  }
  listen() {
    this.server.listen.apply(this.server, arguments);
  }
}

export default Server;