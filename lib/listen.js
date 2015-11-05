var Promise = require('native-promise-only');
var restify = require('restify');
var semver = require('semver');
var debug = require('debug')('servicify');
var values = require('object-values');

var poll = require('../utils').poll;
var getJson = require('../utils').getJson;


var find = require('array-find');
var objectAssign = Object.assign || require('object-assign');

module.exports = function (servicifyOptions) {
  servicifyOptions = objectAssign({
    longPollTimeout: 10000,
    longPollInterval: 100
  }, servicifyOptions);

  return function listen(opts) {
    var server = restify.createServer({
      name: 'servicify-http',
      version: require('../package.json').version
    });

    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    var requests = {};

    var pollers = [];

    // Get a single request from the requests queue
    server.get('/requests/:name/:version', function (req, res, next) {
      debug('received request for work: ', req);

      var poller = poll(function getRequest() {
        var request = find(values(requests), function (r) {
          if (r.started) return false;
          if (r.name !== req.params.name) return false;

          return semver.satisfies(req.params.version, r.version);
        });

        if (request) {
          request.started = Date.now();
        }

        debug('found request %j', request);

        return request;
      }, servicifyOptions.longPollTimeout, servicifyOptions.longPollInterval);

      pollers.push(poller);

      poller.then(function (request) {
        debug('removing poller from pool');
        pollers.splice(pollers.indexOf(poller), 1);
        res.send(request);
        return next();
      }, function (err) {
        pollers.splice(pollers.indexOf(poller), 1);
        if (err.message === 'timeout' || err.message === 'aborted') {
          res.send(204);
        } else {
          debug('ERROR while polling: %s', err);
          res.send(500, err.message);
        }
        next();
      });
    });

    // Record the result to a request
    server.put('/request/:id/result', function (req, res, next) {
      var requestId = req.params.id;
      var request = requests[requestId];
      if (!request) {
        res.send(404);
        next();
      } else {
        var result = req.body.result;

        debug('server: recording result to request %s => %j', requestId, result);

        next();
        request.result = result;
        res.send(204);
      }
    });

    server.get('/request/:id/result', function (req, res, next) {
      var requestId = req.params.id;

      var poller = poll(function getResult() {
        var request = requests[requestId];
        if (request && request.result) {
          return request.result;
        }
        return null;
      }, 10000, 50);

      pollers.push(poller);

      poller.then(function (result) {
        // remove poller from pool of them
        pollers.splice(pollers.indexOf(poller), 1);
        debug('sending result to user %s', result);
        res.send({result: result});
        return next();
      }, function (err) {
        if (err.message === 'timeout' || err.message === 'aborted') {
          res.send(404);
        } else {
          debug('ERROR while polling: %j', err);
          res.send(500, err.message);
        }

        next();
      });
    });

    server.post('/requests', function (req, res, next) {
      var request = req.body;
      requests[request.id] = request;

      debug('Registered request %j as %s', request, request.id);
      res.send(204);
      return next();
    });

    return new Promise(function (resolve) {
      server.listen(opts.port, function () {
        resolve(function stopper() {
          return new Promise(function (resolve) {
            debug('aborting %d pollers', pollers.length);
            server.close(function () {
              pollers.forEach(function (poller) {
                debug('aborting poller: %j', poller);
                poller.abort();
              });

              resolve();
            });
          });
        });
      });
    });
  };
};