const { map } = require('../inMemoryCache/cache');


/**
 * This function is used to parse the command and arguments from the data received from the client
 * @param {Buffer} data - The data received from the client 
 * @returns {[String]} - The command and arguments
 */
function parseCommandAndArguments(data) {
    let args = data.toString().toLowerCase().split("\r\n");
    args.shift();
    let result = [];
    for(let i = 0; i < args.length; i++){
        if(i%2 == 1) {
            result.push(args[i])
        }
    }
    return result;
}

/**
 * This function is used to schedule the removal of a key from the map after a certain timeout
 * @param {String} key - The key to be removed from the map 
 * @param {Number} timeout - The timeout after which the key should be removed 
 */
function scheduleRemovalOfKeyFromMap(key, timeout) {
    setTimeout(() => {
        if(map.has(key)) {
            map.delete(key);
        }
    }, timeout);
}


/**
 * This function is used to broadcast data to all the slaves
 * @param {Object} serverConfig - The server configuration object
 * @param {Buffer} data - The data to be sent to the slaves
 */
function broadcastToSlaves(serverConfig, data) {
    serverConfig.connections.forEach((socket) => {
        socket.write(data);
        console.log('data sent to slave');
    });
}

/**
 * This function is used to generate a dummy RDB file
 * @returns {Buffer} - The buffer containing the RDB file
 */
function bufferRDBFile() {
    const empty_rdb_base64 = "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==";
    const rdbBuffer = Buffer.from(empty_rdb_base64, "base64");
    const rdbHead = Buffer.from(`$${rdbBuffer.length}\r\n`);
    return Buffer.concat([rdbHead,rdbBuffer]);
}

module.exports = {
    parseCommandAndArguments,
    scheduleRemovalOfKeyFromMap,
    broadcastToSlaves,
    bufferRDBFile
};