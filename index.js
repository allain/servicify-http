var objectAssign = require('object-assign');

module.exports = function (opts) {
  opts = objectAssign({
    host: '127.0.0.1',
    port: 2020
  }, opts);

  return {
    listen: require('./lib/listen')(opts),
    offer: require('./lib/offer')(opts),
    call: require('./lib/call')(opts),
    name: 'http'
  };
};

module.exports.defaults = {
  host: '0.0.0.0',
  port: 2020
};
