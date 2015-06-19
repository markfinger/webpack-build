import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import hmr from '../hmr';
import endpoints from './endpoints';

const app = express();
const server = http.Server(app);

app.use(bodyParser.json());

app.get('/', endpoints.index);

app.post('/build', endpoints.build);

hmr.addToServer(server);

export {endpoints, app, server};
export default server;