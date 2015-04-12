var _ = require('lodash');

module.exports = {
  _cache: [],
  find: function(opts) {
    return _.find(this._cache, function(obj) {
      return _.isEqual(obj.opts, opts);
    });
  },
  add: function(obj) {
    this._cache.push(obj);
  },
  clear: function() {
    this._cache = [];
  }
};