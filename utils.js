var Promise = require('dodgy').Promise;
var request = require('request');

var pollCount = 0;

module.exports.poll = function poll(predicate, timeout, interval) {
  var pollName = predicate.name + (++pollCount);

  interval = interval || 100;

  var timesOut = Date.now() + timeout;
  var aborted = false;
  var timeoutId;

  return new Promise(function (resolve, reject, onAbort) {
    var result;

    function test() {
      result = predicate();

      if (result)
        return resolve(result);

      if (aborted)
        return reject(new Error('aborted'));

      if (Date.now() > timesOut)
        return reject(new Error('timeout'));

      timeoutId = setTimeout(test, interval);
    }

    onAbort(function () {
      clearTimeout(timeoutId);
      aborted = true;
      test();
    });

    test();
  });
};

module.exports.getJson = function (url) {
  return new Promise(function (resolve, reject, onAbort) {
    var r = request({uri: url}, function (err, response, body) {
      if (err)
        return reject(err);

      if (response.statusCode === 204)
        return resolve(null);

      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });

    onAbort(function () {
      r.abort();
    });
  });
};

module.exports.putJson = function (url, json) {
  return new Promise(function (resolve, reject, onAbort) {
    var r = request({
      method: 'PUT',
      uri: url,
      json: json
    }, function (err, response, body) {
      if (err)
        return reject(err);

      if (body)
        return resolve();

      try {
        resolve(body);
      } catch (err) {
        reject(err);
      }
    });

    onAbort(function () {
      r.abort();
    });
  });
};

module.exports.postJson = function (url, json) {
  return new Promise(function (resolve, reject, onAbort) {
    var r = request({
      method: 'POST',
      uri: url,
      json: json
    }, function (err, response, body) {
      if (err)
        return reject(err);

      if (body)
        return resolve();

      try {
        resolve(body);
      } catch (err) {
        reject(err);
      }
    });

    onAbort(function () {
      r.abort();
    });
  });
};