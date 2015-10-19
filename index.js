var Promise = require('native-promise-only');
var restify = require('restify');

var debug = require('debug')('servicify');
var poll = require('./utils').poll;
var getJson = require('./utils').getJson;

var values = require('object-values');
var objectAssign = require('object-assign');

module.exports = function (servicifyOptions) {
  servicifyOptions = objectAssign({
    host: '127.0.0.1',
    port: 2020
  }, servicifyOptions);

  return {
    listen: require('./lib/listen')(servicifyOptions),
    offer: require('./lib/offer')(servicifyOptions),
    request: require('./lib/request')(servicifyOptions),
    name: 'http'
  };
};
