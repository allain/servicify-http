'use strict';

var Promise = require('native-promise-only');

var debug = require('debug')('servicify');
var getJson = require('../utils').getJson;
var putJson = require('../utils').putJson;

module.exports = function () {
  return function offer(spec, invoke, opts) {
    var stopped = false;
    var getter = null;

    function fetchRequest(spec, invoke, opts) {
      if (stopped) {
        debug('offering stopped: %j', spec);
        return;
      }

      getter = getJson('http://' + opts.host + ':' + opts.port + '/requests/' + spec.name + '/' + spec.version);
      debug('Requesting http://' + opts.host + ':' + opts.port + '/requests/' + spec.name + '/' + spec.version);

      getter.then(function (req) {
        setImmediate(function () {
          fetchRequest(spec, invoke, opts);
        });

        if (req === null) {
          debug('No work request found');
          return;
        }

        invoke(req.args).then(function (result) {
          debug('sending reponse %s => %j', req.id, result);

          putJson('http://' + opts.host + ':' + opts.port + '/request/' + req.id + '/result', {result: result}, function (err) {
            if (err)
              return debug('ERROR sending result to server: %j', err);
          });
        }, function(err) {
          debug('sending error response %s => %j', req.id, err);

          putJson('http://' + opts.host + ':' + opts.port + '/request/' + req.id + '/result', {error: err.message}, function (err) {
            if (err)
              return debug('ERROR sending error to server: %j', err);
          });
        });
      });
    }

    // Spark off the long polling
    fetchRequest(spec, invoke, opts);

    return Promise.resolve(function () {
      debug('stopping offering %j', spec);
      stopped = true; // next time download gives up, it'll cancel for good
      if (getter) {
        getter.abort();
      }
    });
  };
};
