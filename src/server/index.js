import http from 'http';
import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import build from '../build';
import defaults from '../options/defaults';
import caches from '../caches/caches';
import wrappers from '../wrappers';
import options from '../options';
import log from '../log';
import packageJson from '../../package';
import processData from '../utils/process_data';
import hmr from '../hmr';
import endpoints from './endpoints';

export {endpoints} from './endpoints;
export const app = express();
export const server = http.Server(app);
export default server;

app.use(bodyParser.json());

app.get('/', endpoints.index);

app.post('/build', endpoints.build);

hmr.addToServer(server);