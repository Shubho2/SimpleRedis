'use strict';

const MasterServer = require('../srv/MasterServer');
const ReplicaServer = require('../srv/ReplicaServer');

function _initMaster(serverConfig) {
    const server = new MasterServer(serverConfig);
    server.startServer();
}

function _initReplica(serverConfig) {
    const server = new ReplicaServer(serverConfig);
    server.startServer();
}


/**
 * This function is used to initialize the server based on the server configuration object.
 * @param {Object} serverConfig - The server configuration object
 */
function init(serverConfig) {
    if(serverConfig.role === "master") {
        _initMaster(serverConfig);
    } else {
        _initReplica(serverConfig);
    }
}

module.exports = { init };