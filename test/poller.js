var test = require('blue-tape');

var poll = require('../utils').poll;

test('works in normal, delayed case', function(t) {
  var resolvesAt = Date.now() + 50;

  return poll(function() {
    if (Date.now() >= resolvesAt) {
      return 'RESOLVED';
    }
  }, 100000000, 10).then(function(result) {
    t.equal(result, 'RESOLVED');
  });
});

test('works in normal, undelayed case', function(t) {
  var start = Date.now();
  return poll(function() {
    return 'RESOLVED';
  }, 100000000, 10000).then(function(result) {
    t.equal(result, 'RESOLVED');
    t.ok(Date.now() - start < 5, 'less than 5 ms when predicate is initially true');
  });
});

test('false predicates will eventually time out', function(t) {
  return poll(function() {
    return false;
  }, 100, 100).catch(function(err) {
    t.ok(err instanceof Error, 'expects an error');
    t.equal(err.message, 'timeout', 'expects timeout message');
  });
});

test('can be aborted', function(t) {
  var poller = poll(function() {
    return false;
  }, 100000, 10);

  poller.catch(function(err) {
    t.ok(err instanceof Error, 'expects an error');
    t.equal(err.message, 'aborted', 'expects aborted message');
    t.end();
  });

  t.equal(typeof poller.abort, 'function', 'expects abort function');

  poller.abort();
});
