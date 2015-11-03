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

      return new Promise(function(resolve) {
        function fetchResponse() {
          debug('fetchResponse %s', requestId);

          getJson('http://' + opts.host + ':' + opts.port + '/request/' + requestId + '/result').then(function (result) {
            resolve(result.result);
          }).catch(function(err) {
            console.error(err);
            setImmediate(fetchResponse);
          });
        }

        fetchResponse();
      });
    });
  };
};