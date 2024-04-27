const net = require('net');
const formatter = require('../helperFunctions/formatter');
const { map } = require('../inMemoryCache/cache');
const { parseCommandAndArguments,
    scheduleRemovalOfKeyFromMap,
    broadcastToSlaves,
    bufferRDBFile } = require('../helperFunctions/util');

/**
 * This function is used to handle the request from the client
 * @param {net.Socket} socket - The socket object 
 * @param {Buffer} data - The data received from the client 
 * @param {Object} serverConfig - The server configuration object 
 */
function handleRequest(socket, data, serverConfig) {
    let [command, ...args] = parseCommandAndArguments(data);
    console.log("command:" + command + " args:" + args);
    let response = "";
    switch(command){
        case "echo":
            console.log("Echoing");
            response = formatter.formatBulkString(args[0]);
            socket.write(response);
            break;
        case "ping":
            console.log("Pinging");
            response = formatter.formatSimpleString("PONG");
            socket.write(response);
            break;
        case "set":
            console.log("Set command");
            map.set(args[0], args[1]);
            if(args[2] === "px") {
                scheduleRemovalOfKeyFromMap(args[0], args[3]);
            }
            response = formatter.formatSimpleString("OK");
            if(serverConfig.role === "master") {
                broadcastToSlaves(serverConfig, data);
            }
            socket.write(response);
            break;
        case "get":
            console.log("Get command");
            let val = map.get(args[0]);
            response = formatter.formatBulkString(val);
            socket.write(response);
            break;
        case "info":
            console.log("Info command");
            if(args[0] === "replication") {
                let responseString = `role:${serverConfig.role}`
                if(serverConfig.role === "master") {
                    response = formatter.formatBulkString(responseString + '\r\n' +
                    `master_replid:${serverConfig.master_replid}\r\n` +
                    `master_repl_offset:${serverConfig.master_repl_offset}\r\n`);
                } else {
                    response = formatter.formatBulkString(responseString);
                }
            }
            socket.write(response);
            break;
        case "replconf":
            console.log("Replconf command");
            if(args[0] === "listening-port") {
                // saving the socket object for future use, instead of the port. 
                serverConfig.connected_slaves.push(args[1]);
                serverConfig.connections.push(socket);
            }
            response = formatter.formatSimpleString("OK");
            socket.write(response);
            break;
        case "psync":
            console.log("Psync command");
            response = formatter.formatSimpleString(`FULLRESYNC ${serverConfig.master_replid} ${serverConfig.master_repl_offset}`);
            socket.write(response);
            response = bufferRDBFile();
            console.log(`RDB file sent: ${response}`);
            socket.write(response);
            break;
    }
}

module.exports = { handleRequest };