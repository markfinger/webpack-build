import http from 'http';
import express from 'express';
import hmr from '../hmr';
import middleware from './middleware'
import bodyParser from 'body-parser';

let app = express();
let server = http.Server(app);

app.use(bodyParser.json());
app.use(middleware);

hmr.addToServer(server);

export default server;