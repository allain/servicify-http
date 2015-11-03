'use strict';

var Promise = require('native-promise-only');

var restify = require('restify');
var debug = require('debug')('servicify');

var poll = require('../utils').poll;
var getJson = require('../utils').getJson;
var putJson = require('../utils').putJson;

module.exports = function (/*servicifyOptions*/) {
  return function offer(spec, invoke, opts) {
    var stopped = false;
    var getter = null;

    function fetchRequest(spec, invoke, opts) {
      if (stopped) {
        debug('offering stopped: %j', spec);
        return;
      }

      getter = getJson('http://' + opts.host + ':' + opts.port + '/requests/' + spec.name + '/' + spec.version);

      getter.then(function (req) {
        setImmediate(function () {
          debug('tick fetchRequest');
          fetchRequest(spec, invoke, opts);
        });

        invoke(req.args).then(function (result) {
          debug('sending reponse %s => %j', req.id, result);

          putJson('http://' + opts.host + ':' + opts.port + '/request/' + req.id + '/result', {result: result}, function (err) {
            if (err)
              return debug('ERROR sending result to server: %j', err);
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
