'use strict';

module.exports = {
  BadRequestError: message => {
    this.name = 'BAD_REQUEST_ERROR';
    this.message = 'The request was not build correctly: ' + message;
    this.code = '4.00';
  },
  DeviceNotFound: id => {
    this.name = 'DEVICE_NOT_FOUND';
    this.message = 'The device with id: ' + id + ' was not found';
    this.code = '4.04';
  },
  ClientError: code => {
    this.name = 'CLIENT_ERROR';
    this.message = 'Error code recieved from the client: ' + code;
    this.code = code;
  },
  ObjectNotFound: id => {
    this.name = 'OBJECT_NOT_FOUND';
    this.message =
      'The object with id: ' + id + ' was not found in the registry';
    this.code = '4.04';
  },
  UnsupportedAttributes: attributes => {
    this.name = 'UNSUPPORTED_ATTRIBUTES';
    this.message =
      'Unsupported attributes writting to object URI: ' +
      JSON.stringify(attributes);
    this.code = '4.00';
  },
  ServerNotFound: url => {
    this.name = 'SERVER_NOT_FOUND';
    this.message = 'No server was found on url: ' + url;
    this.code = '4.04';
  },
  ResourceNotFound: (id, type, objectId) => {
    this.name = 'RESOURCE_NOT_FOUND';
    this.code = '4.04';

    if (id && type && objectId) {
      this.message =
        'The resource with id: ' +
        id +
        ' for the object with type ' +
        type +
        ' id ' +
        objectId +
        ' was not found in the registry';
    } else {
      this.message = 'The resource was not found in the registry';
    }
  },
  WrongObjectUri: uri => {
    this.name = 'WRONG_OBJECT_URI';
    this.message = 'Tried to parse wrong object URI: ' + uri;
    this.code = '4.00';
  },
  InternalDbError: msg => {
    this.name = 'INTERNAL_DB_ERROR';
    this.message = 'An internal DB Error happened: ' + msg;
    this.code = '5.01';
  },
  TypeNotFound: url => {
    this.name = 'TYPE_NOT_FOUND';
    this.message = 'No type matching found for URL ' + url;
    this.code = '4.04';
  },
  IllegalTypeUrl: url => {
    this.name = 'ILLEGAL_TYPE_URL';
    this.message =
      'Illegal URL for type: ' +
      url +
      '. Types begining with "/rd" are not allowed';
    this.code = '4.00';
  },
  RegistrationError: msg => {
    this.name = 'REGISTRATION_ERROR';
    this.message =
      'There was an error connecting to the LWM2M Server for registration: ' +
      msg;
    this.code = '5.01';
  },
  UpdateRegistrationError: msg => {
    this.name = 'UPDATE_REGISTRATION_ERROR';
    this.message =
      'There was an error connecting to the LWM2M Server for update registration: ' +
      msg;
    this.code = '5.01';
  },
  UnregistrationError: msg => {
    this.name = 'UNREGISTRATION_ERROR';
    this.message =
      'There was an error connecting to the LWM2M Server for unregistration: ' +
      msg;
    this.code = '5.01';
  },
  RegistrationFailed: code => {
    this.name = 'REGISTRATION_FAILED';
    this.message =
      'Registration to the Lightweight M2M server failed with code: ' + code;
    this.code = code;
  },
  IllegalMethodAttributes: code => {
    this.name = 'ILLEGAL_METHOD_ATTRIBUTES';
    this.message =
      'The method was called with wrong number or type of attributes ' +
      'or at least one mandatory attribute is empty';
    this.code = '5.01';
  },
  ClientConnectionError: msg => {
    this.name = 'CLIENT_CONNECTION_ERROR';
    this.message = 'There was an error sending a request to the client: ' + msg;
    this.code = '5.01';
  },
  ClientResponseError: msg => {
    this.name = 'CLIENT_RESPONSE_ERROR';
    this.message = 'Error received while waiting for a client response: ' + msg;
    this.code = '5.01';
  },
  ContentFormatNotFound: () => {
    this.name = 'CONTENT_FORMAT_NOT_FOUND';
    this.message = 'No Content Format list found.';
    this.code = '4.00';
  }
};
