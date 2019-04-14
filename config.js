var config = {};
config = {
    lifetime: '85671',
    version: '1.0',
    logLevel: 'DEBUG',
    observe: {
        period: 3000
    },
    ipProtocol: 'udp4',
    serverProtocol: 'udp4',
    formats: [
        {
            name: 'lightweightm2m/text',
            value: 1541
        }
    ],
    writeFormat: 'lightweightm2m/text'
};

module.exports = config;
