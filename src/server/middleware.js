import {index, buildRequest} from './views';

export default (req, res, next) => {
  if (req.method == 'GET') {
    return index(req, res);
  } else if (req.method == 'POST') {
    return buildRequest(req, res);
  }
  next();
};