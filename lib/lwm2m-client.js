'use strict';

const objRegistry = require('./services/client/objectRegistry');
const coap = require('coap');
const errors = require('./errors');
const async = require('async');
const apply = async.apply;
const readService = require('./services/client/read');
const coapRouter = require('./services/coapRouter');
const Readable = require('stream').Readable;
const logger = require('logops');
const { EventEmitter } = require('events');
const context = {
  op: 'LWM2MLib.Client'
};
const assert = require('assert');
let config;

/**
 * Class LWM2MClient
 *
 * @class LWM2MClient
 * @extends {EventEmitter}
 */
class LWM2MClient extends EventEmitter {
  constructor(config) {
    super();
    this.registry = objRegistry;
    this.logger = logger;
    this.config = config;
    this.coapRouterSetHandler = coapRouter.setHandler;
    this.cancelObserver = readService.cancel;
    this.cancellAllObservers = readService.cancelAll;
    this.listObservers = readService.list;
    this.deviceInformation = {};
  }

  /**
   * Register the client in the Lightweight M2M Server in the seleted host and port, with the given endpoint name. If the
   * registration is successful, a deviceInformation object is returned with the host and port of the connected server
   * and the device location in that server (usually with the form '/rd/<deviceId>').
   *
   * @param {String} host                  Host of the LWTM2M Server
   * @param {String} port                  Port of the LWTM2M Server
   * @param {String} url                   URL of the LWTM2M Server (optional)
   * @param {String} endpointName          Name the client will be registered under
   */
  register(host, port, url, endpointName) {
    assert(host && typeof host === 'string', 'host必填且为字符串');
    assert(port && typeof port === 'number', 'port必填且为数字');
    assert(
      endpointName && typeof endpointName === 'string',
      'stringt必填且为字符串'
    );
    if (url) assert(typeof url === 'string', 'url需为字符串');

    const { lifetime, version, ipProtocol, logLevel } = this.config;
    const creationRequest = {
      host,
      port,
      method: 'POST',
      pathname: `${url || ''}/rd`,
      query:
        'ep=' + endpointName + '&lt=' + lifetime + '&lwm2m=' + version + '&b=U'
    };
    this.deviceInformation = {
      currentHost: host,
      currentPort: port,
      location: ''
    };

    const agent = new coap.Agent({ type: ipProtocol });
    const req = agent.request(creationRequest);

    if (logLevel) this.logger.setLevel(logLevel);

    let objResources;
    this.registry.list((error, resources) => {
      if (error) this.logger.error(error);
      if (resources) objResources = resources;
    });
    assert(objResources, '未找到任何uri资源');

    const payload = this.generatePayload(objResources);
    this.sendRequest(req, payload);
    this.startListener();
  }

  /**
   * 设备取消注册
   *
   * @param {*} deviceInformation
   * @param {*} callback
   * @memberof LWM2MClient
   */
  unregister(deviceInformation, callback) {
    var creationRequest = {
        host: deviceInformation.currentHost,
        port: deviceInformation.currentPort,
        method: 'DELETE',
        pathname: deviceInformation.location,
        agent: false
      },
      agent = new coap.Agent({ type: config.client.ipProtocol }),
      req = agent.request(creationRequest);

    logger.debug(
      context,
      'Unregistration request:\n%s',
      JSON.stringify(creationRequest, null, 4)
    );

    req.on('response', function(res) {
      logger.debug(context, 'Unregistration response code:\n%s', res.code);

      async.series(
        [
          readService.cancelAll,
          apply(coapRouter.stop, deviceInformation.serverInfo)
        ],
        callback
      );
    });

    req.on('error', function(error) {
      logger.error(
        context,
        'There was an error during unregistration: %s',
        error
      );
      callback(new errors.UnregistrationError(error));
    });

    req.end();
  }

  /**
   * 更新设备注册信息
   *
   * @param {*} deviceInformation
   * @param {*} callback
   * @memberof LWM2MClient
   */
  updateRegistration(deviceInformation, callback) {
    var rs = new Readable(),
      creationRequest = {
        host: deviceInformation.currentHost,
        port: deviceInformation.currentPort,
        method: 'POST',
        pathname: deviceInformation.location,
        query:
          'lt=' +
          config.client.lifetime +
          '&lwm2m=' +
          config.client.version +
          '&b=U'
      },
      agent = new coap.Agent({ type: config.client.ipProtocol }),
      req = agent.request(creationRequest);

    logger.debug(
      context,
      'Update registration request:\n%s',
      JSON.stringify(creationRequest, null, 4)
    );

    function sendRequest(payload, innerCallback) {
      rs.push(payload);
      rs.push(null);

      rs.on('error', function(error) {
        logger.error(
          context,
          'There was a connection error during update registration process: %s',
          error
        );
        callback(new errors.UpdateRegistrationError(error));
      });

      req.on(
        'response',
        this.createRegisterResponseHandler(deviceInformation, innerCallback)
      );

      req.on('error', function(error) {
        req.removeAllListeners();

        logger.error(
          context,
          'Request error during update registration process: %s',
          error
        );
        innerCallback(new errors.UpdateRegistrationError(error));
      });

      rs.pipe(req);
    }

    async.waterfall(
      [
        objRegistry.list,
        generatePayload,
        sendRequest,
        async.apply(startListener, deviceInformation)
      ],
      callback
    );
  }

  /**
   *
   *
   * @param {*} deviceInformation
   * @param {*} callback
   * @returns
   * @memberof LWM2MClient
   */
  createRegisterResponseHandler(deviceInformation) {
    return function responseHandler(res) {
      if (res.code.match(/^2\.\d\d$/)) {
        logger.debug(
          context,
          'Registration oparation succeeded to host [%s] and port [%s] with code [%s]',
          deviceInformation.host,
          deviceInformation.port,
          res.code
        );

        deviceInformation.localPort = res.outSocket.port;

        for (var i = 0; i < res.options.length; i++) {
          if (res.options[i].name === 'Location-Path') {
            if (deviceInformation.location) {
              deviceInformation.location += '/';
            }

            deviceInformation.location += res.options[i].value;
          }
        }
      } else {
        logger.error(context, 'Registration failed with code: ' + res.code);
        throw new Error(new errors.RegistrationFailed(res.code));
      }
    };
  }

  /**
   * 发送register请求
   *
   * @param {Object} req
   * @param {Strinng} payload
   * @param {Function} innerCallback
   * @memberof LWM2MClient
   */
  sendRequest(req, payload) {
    const radstream = new Readable();
    radstream.push(payload);
    radstream.push(null);

    radstream.on('error', error => {
      logger.error(
        'Error found trying to send registration request: %s',
        payload
      );
      innerCallback(new errors.RegistrationError(error));
    });

    req.on(
      'response',
      this.createRegisterResponseHandler(this.deviceInformation)
    );

    req.on('error', error => {
      req.removeAllListeners();

      if (error.code === 'ENOTFOUND') {
        logger.error('Server not found [%s]', req.url.host);
        throw new Error(new errors.ServerNotFound(req.url.host));
      } else {
        logger.error(
          'An error was found while trying to register a response listener'
        );
        throw new Error(new errors.RegistrationError(error));
      }
    });

    this.logger.debug('Sending registration request');
    radstream.pipe(req);
  }

  /**
   * Creates a COAP Text representation of the objects passed as a parameter.
   *
   * @param {Array} objects       Array containing LWM2M Object instances.
   * @returns {String} payload
   */
  generatePayload(objects) {
    return objects.reduce((previous, current, index, array) => {
      var result = previous + '<' + current.objectUri + '>';
      if (index !== array.length - 1) {
        result += ',';
      }
      return result;
    }, '');
  }

  /**
   * Starts a new listener for the client in the same port used for the communication. Some problems may arrise here
   * due to the time the socket needs to be freed from its previous use. To avoid this problem, a small delay is added
   * before any retry and the connection is retried n times.
   *
   * @param {Object} deviceInformation        Listener information from the COAP library
   */
  startListener(callback) {
    this.config.port = this.deviceInformation.localPort;

    const loadRoutes = serverInfo => {
      serverInfo.routes = [
        ['POST', /\/\d+\/\d+\/\d+/, 'execute'],
        ['PUT', /(\/\d+)+/, 'write'],
        ['GET', /(\/\d+)+/, 'read']
      ];
    };

    const loadHandlers = serverInfo => {
      serverInfo.handlers = {
        write: {
          lib: require('./services/client/write').handle,
          user: coapRouter.defaultHandler
        },
        execute: {
          lib: require('./services/client/execute').handle,
          user: coapRouter.defaultHandler
        },
        read: {
          lib: readService.handle,
          user: coapRouter.defaultHandler
        }
      };
    };

    const startCoapServer = callback => {
      try {
        coapRouter.start(config.client, callback);
      } catch (error) {
        callback(error);
      }
    };

    const extractListenerInfo = (serverInfo, callback) => {
      logger.info(context, 'COAP Router started successfully');

      this.deviceInformation.serverInfo = serverInfo;
      loadHandlers(this.deviceInformation.serverInfo);
      loadRoutes(this.deviceInformation.serverInfo);

      callback(null, this.deviceInformation);
    };

    const startListener = callback => {
      async.waterfall(
        [async.nextTick, startCoapServer, extractListenerInfo],
        callback
      );
    };

    const handleListenerStarted = (error, deviceInformation) => {
      if (error) {
        logger.error(context, 'Failed to start COAP Router for client.');
      } else {
        callback(null, deviceInformation);
      }
    };

    async.retry(
      { times: 3, interval: 10 },
      startListener,
      handleListenerStarted
    );
  }
}

module.exports = LWM2MClient;
