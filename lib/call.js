var muid = require('micro-uid');

var postJson = require('../utils').postJson;
var getJson = require('../utils').getJson;

var debug = require('debug')('servicify:http:request');

var objectAssign = Object.assign || require('object-assign');

module.exports = function(servicifyOptions) {
  return function perform(spec, args, opts) {
    opts = objectAssign({}, servicifyOptions, opts, {
      timeout: 10000
    });

    var requestId = muid();

    return postJson('http://' + opts.host + ':' + opts.port + '/requests', {
      id: requestId,
      args: args,
      name: spec.name,
      version: spec.version
    }).then(function () {
      debug('request posted');

      return new Promise(function(resolve, reject) {
        function fetchResponse() {
          debug('fetching response: %s', 'http://' + opts.host + ':' + opts.port + '/request/' + requestId + '/result');
          getJson('http://' + opts.host + ':' + opts.port + '/request/' + requestId + '/result').then(function (result) {
            if (result.result) {
              resolve(result.result);
            } else {
              reject(result.error);
            }
          }).catch(function(err) {
            debug('error fetchign json response: ', err);
            setImmediate(fetchResponse);
          });
        }

        fetchResponse();
      });
    });
  };
};