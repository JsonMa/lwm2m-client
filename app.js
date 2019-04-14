const LWM2MClient = require('./lib/lwm2m-client');
const defaultConfig = require('./config');

const deviceInfo = {
  '/3/0': {
    '0': '中国移动'
  },
  '/4/0': {
    '6': 20
  },
  '/32771/0': {
    '0': '1234'
  }
};

const lwm2mClient = new LWM2MClient(
  Object.assign(defaultConfig, {
    lifetime: 5000
  })
);

// 设置devicee初始信息
Object.keys(deviceInfo).forEach(key => {
  lwm2mClient.registry.create(key);
  Object.keys(key).forEach(subKey => {
    lwm2mClient.registry.setResource(key, subKey, deviceInfo[key][subKey]);
  });
});

lwm2mClient.register(
  '183.230.40.40',
  5683,
  null,
  '000201000022000;000010000100001'
);

lwm2mClient.on('error', err => {
  console.log(err);
});

lwm2mClient.on('inited', () => {
  console.log('inited');
});
