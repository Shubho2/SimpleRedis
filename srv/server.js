'use strict'

const net = require("net");
const util = require("util");
const formatter = require("../helperFunctions/formatter");
const requestHandler = require("./requestHandler");

function _createServer(serverConfig) {
    const server = net.createServer((socket) => {
        socket.on("data", (data) => {
            let response = requestHandler.handleRequest(data, serverConfig);
            socket.write(response);
        });
        console.log("Client connected");
    });

    server.listen(serverConfig.port, serverConfig.host, () => {
        console.log("Server started on port " + serverConfig.port);
    });
}

function _handshakeWithMaster(serverConfig) {
    let socket = new net.Socket();
    let hostId = serverConfig.master_host === "localhost" ? "127.0.0.1" : serverConfig.master_host;
    socket.connect(serverConfig.master_port, hostId);

    socket.on("connect", () => {
        console.log("Connected to master");
        socket.write(formatter.formatArrays(["ping"]), "utf8");
    });

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

function init(serverConfig) {
    if(serverConfig.role === "master") {
        _initMaster(serverConfig);
    } else {
        _initSlave(serverConfig);
    }
}

module.exports = { init };