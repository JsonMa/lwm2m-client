'use strict';

const libcoap = require('coap');
const logger = require('logops');
const errors = require('../errors');
const defaultFormats = require('./OMAContentFormats');
const Window = require('./slidingWindow');
const context = {
  op: 'LWM2MLib.COAPRouter'
};

const { EventEmitter } = require('events');

class CoapServer extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
  }

  defaultHandler() {
    var callback = null;

    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Function) {
        callback = arguments[i];
      }
    }

    callback();
  }
  /**
   * Load the COAP Content Formats and numbers used in LWM2M.
   */
  loadLightweightM2MFormats(config) {
    var formats;

    if (config.formats) {
      formats = config.formats;
    } else if (defaultFormats && defaultFormats.formats) {
      formats = defaultFormats.formats;
      config.formats = formats;
    } else {
      throw new errors.ContentFormatNotFound();
    }

    if (!config.writeFormat && defaultFormats && defaultFormats.writeFormat) {
      config.writeFormat = defaultFormats.writeFormat;
    }

    for (var i = 0; i < formats.length; i++) {
      libcoap.registerFormat(formats[i].name, formats[i].value);
    }
  }

  start(config, callback) {
    const serverInfo = {
      server: null,
      routes: [],
      handlers: null
    };

    if (config.udpWindow) {
      serverInfo.window = new Window(config.udpWindow);
    } else {
      serverInfo.window = new Window(100);
    }

    logger.info(context, 'Starting COAP Server on port [%d]', config.port);

    loadLightweightM2MFormats(config);

    serverInfo.server = libcoap.createServer({
      type: config.serverProtocol,
      proxy: true,
      piggybackReplyMs: 500
    });

    serverInfo.server.on('request', dataHandler(serverInfo));

    serverInfo.server.on('error', error => {
      logger.error(
        context,
        'An error occurred creating COAP listener: %j',
        error
      );
      callback(error);
    });

    serverInfo.server.listen(config.port, error => {
      if (error) {
        logger.error(context, "Couldn't start COAP server: %s", error);
        this.emit('error', error);
      } else {
        logger.info(context, 'COAP Server started successfully');
      }

      callback(error, serverInfo);
    });
  }

  /**
   *  Stops the LWTM2M Server.
   *
   * @param {Object} serverInfo      Object containing all the information of the current server.
   */
  stop(serverInfo, callback) {
    logger.info(context, 'Stopping COAP Server');

    if (serverInfo.server) {
      serverInfo.server.close(callback);
    } else {
      logger.error(context, 'Tried to close an unexistent server');
      callback();
    }
  }

  /**
   * Handles the arrival of a request to the LWTM2M Server. To do so, it loops through the routes table, trying to match
   * the pathname and method of the request to an existing route. If a route matches, and the route has a handler,
   * the handler is invoked with the request, response and user handler for that operation. Otherwise, a 4.04 error is
   * returned.
   *
   * @param {Object} serverInfo      Object containing all the information of the current server.
   */
  dataHandler(serverInfo) {
    return function(req, res) {
      if (
        req.code === '0.00' &&
        req._packet.confirmable &&
        req.payload.length === 0
      ) {
        res.reset();
      } else if (serverInfo.window.contains(req._packet.messageId)) {
        logger.debug(
          context,
          'Discarding duplicate package [%s] on url [%s] with messageId [%d]',
          req.method,
          req.url,
          req._packet.messageId
        );
      } else {
        serverInfo.window.push(req._packet.messageId);

        logger.debug(
          context,
          'Handling request with method [%s] on url [%s] with messageId [%d]',
          req.method,
          req.url,
          req._packet.messageId
        );

        req.urlObj = require('url').parse(req.url);

        for (var i in serverInfo.routes) {
          if (
            req.method === serverInfo.routes[i][0] &&
            req.urlObj.pathname.match(serverInfo.routes[i][1])
          ) {
            serverInfo.handlers[serverInfo.routes[i][2]].lib(
              req,
              res,
              serverInfo.handlers[serverInfo.routes[i][2]].user
            );
            return;
          }
        }
      }
    };
  }

  /**
   * Sets the handler callback for a given type of operation. If for a given type no handler is provided, a default
   * dummy handler will be used.
   *
   * The signature of the handler will depend on the operation being handled. The complete list of operations and the
   * signature of its handlers can be found in the online documentation.
   *
   * @param {Object} serverInfo      Object containing all the information of the current server.
   * @param {String} type         Name of the operation to be handled.
   * @param {Function} handler    Operation handler.
   */
  setHandler(serverInfo, type, handler) {
    logger.debug(context, 'Setting [%s] handler', type);
    serverInfo.handlers[type].user = handler;
  }
}

module.exports = CoapServer;

// exports.start = startCoap;
// exports.setHandler = setHandler;
// exports.stop = stopCoap;
// exports.defaultHandler = defaultHandler;
