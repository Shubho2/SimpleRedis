'use strict'

const net = require("net");
const formatter = require("../helperFunctions/formatter");
const requestHandler = require("./requestHandler");

/** 
 * This function is used to create a server based on the server configuration object.
 * @param {Object} serverConfig - The server configuration object
*/
function _createServer(serverConfig) {
    const server = net.createServer((socket) => {
        socket.on("data", (data) => {
            requestHandler.handleRequest(socket, data, serverConfig);
        });
        console.log("Client connected");
    });

    server.listen(serverConfig.port, serverConfig.host, () => {
        console.log("Server started on port " + serverConfig.port);
    });
}

/**
 * This function is used to handshake with the master server.
 * @param {Object} serverConfig - The server configuration object
 */
function _handshakeWithMaster(serverConfig) {
    let socket = net.createConnection(serverConfig.master_port, serverConfig.master_host);

    socket.on("connect", () => {
        console.log("Connected to master");
        socket.write(formatter.formatArrays(["ping"]), "utf8");
    });

    // This is a flag to ensure that we only send the capabilities once
    // TODO: This is a hacky way to do this. Find a better way. Can we use a state machine? CSP?
    let capabilitiesDidSend = false;

    socket.on("data", (data) => {
        console.log("received from master: " + data.toString());

        if(data.toString() === "+PONG\r\n") {
            socket.write(formatter.formatArrays(["REPLCONF", "listening-port", serverConfig.port]), "utf8");
        } else if(data.toString() === "+OK\r\n") {
            if(!capabilitiesDidSend) {
                socket.write(formatter.formatArrays(["REPLCONF", "capa", "psync2"]), "utf8", (err) => {
                    if(err) {
                        console.log("Error writing to master");
                    } else {
                        console.log("Sent capabilities to master");
                        capabilitiesDidSend = true;
                    }
                });
            } else {
                console.log("Handshake successful");
                socket.write(formatter.formatArrays(["PSYNC", "?", "-1"]), "utf8");
            }
        } else if(data.toString().includes('*')) {
            console.log("Handling propagated data " + data.toString());
            let queries = data.toString();

            // Trimming the RDB file content from the data
            queries = queries.substring(queries.indexOf('*'));

            while(queries.length > 0) {
                let index = queries.indexOf('*', 1);
                let query;
                if(index == -1) {
                    query = queries;
                    queries = '';
                } else {
                    query = queries.substring(0, index);
                    queries = queries.substring(index);
                }
                console.log("Handling query: " + query);
                requestHandler.handleRequest(socket, query, serverConfig);

                // Incrementing the bytes read from the master after handling the query
                serverConfig.bytes_read_from_master += query.length;
                console.log('bytes_read: ' + serverConfig.bytes_read_from_master);
            }

        }
    });
}

function _initMaster(serverConfig) {
    _createServer(serverConfig);
}

function _initSlave(serverConfig) {
    _createServer(serverConfig);
    _handshakeWithMaster(serverConfig);
}


/**
 * This function is used to initialize the server based on the server configuration object.
 * @param {Object} serverConfig - The server configuration object
 */
function init(serverConfig) {
    if(serverConfig.role === "master") {
        _initMaster(serverConfig);
    } else {
        _initSlave(serverConfig);
    }
}

module.exports = { init };