const assert = require('assert')
const _ = require('lodash')
const parser = () => {

}

const valToBytes = (value) => {
  assert(value, '[valToBytes] - valu必填')

  let convertedVal
  switch (typeof value) {
    case 'number':
      const isFloat = value % 1 === 0;
      const parsedVal = isFloat ? parseInt(value) : parseFloat(value)
      if (!isFloat && parsedVal) {
        convertedVal = Buffer.alloc(4)
        convertedVal.writeInt32BE(parsedVal)
      } else {
        convertedVal = Buffer.alloc(8)
        convertedVal.writeFloatBE(parsedVal)
      }
      break;
    case 'boolean':
      convertedVal = Buffer.from(value ? '01' : '00', 'hex')
      break;
    case 'string':
      convertedVal = Buffer.from(value, 'utf-8')
      break;
    default:
      throw new Error('未识别的value类型')
  }
  return convertedVal
}

const resourcePackager = (resourceId, value) => {
  assert(typeof resourceId === 'number', 'resourceId必填且为数值型')
  assert(value, 'value为必填')

  const TYPE_BUFFER = Buffer.alloc(1);
  let IDENTIFER_BUFFER;
  let LENGTH_BUFFER;
  let VALUE_BUFFER;

  // 构造TYPE_BUFFER数据
  let INIT_TYPE = '';
  const ID_TYPE = '11'; // bit 7-6
  let ID_LENGTH; // bit 5
  let TYPE_LENGTH; // bit 4-3
  let VAL_LENGTH; // bit 2-0

  INIT_TYPE += ID_TYPE
  if (resourceId >= 0 && resourceId < 255) {
    ID_LENGTH = '0'
    IDENTIFER_BUFFER = Buffer.alloc(1)
    IDENTIFER_BUFFER.writeUInt8(resourceId)
  } else if (resourceId >= 255 && resourceId < 65535) {
    ID_LENGTH = '1'
    IDENTIFER_BUFFER = Buffer.alloc(2)
    IDENTIFER_BUFFER.writeUInt16BE(resourceId)
  } else throw new Error('resourceId值超出范围')
  INIT_TYPE += ID_LENGTH

  VALUE_BUFFER = valToBytes(value)
  const BYTES_LENGTH = VALUE_BUFFER.length
  if (BYTES_LENGTH > 0 && BYTES_LENGTH <= 7) {
    TYPE_LENGTH = '00';
    VAL_LENGTH = _.pad(Number(BYTES_LENGTH).toString(2), 3, '0')
  } else {
    VAL_LENGTH = '000'
    if (BYTES_LENGTH <= 255) {
      TYPE_LENGTH = '01'
      LENGTH_BUFFER = Buffer.alloc(1)
      LENGTH_BUFFER.writeUInt8(BYTES_LENGTH)
    } else if (BYTES_LENGTH <= 65535) {
      TYPE_LENGTH = '10'
      LENGTH_BUFFER = Buffer.alloc(2)
      LENGTH_BUFFER.writeUInt16BE(BYTES_LENGTH)
    } else {
      TYPE_LENGTH = '11'
      LENGTH_BUFFER = Buffer.alloc(3)
      LENGTH_BUFFER.writeUInt32BE(BYTES_LENGTH)
    }
  }
  INIT_TYPE += (TYPE_LENGTH + VAL_LENGTH)
  TYPE_BUFFER.writeUInt8(parseInt(INIT_TYPE, 2))

  let totalLength = 0;
  [TYPE_BUFFER, IDENTIFER_BUFFER, LENGTH_BUFFER, VALUE_BUFFER].forEach(item => {
    totalLength += item.length
  })

  return Buffer.concat([TYPE_BUFFER, IDENTIFER_BUFFER, LENGTH_BUFFER, VALUE_BUFFER], totalLength)
}

module.exports = {
  resourcePackager,
  parser
}
