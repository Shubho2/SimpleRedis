const net = require("net");
const formatter = require("./formatter");

let map = new Map();
let serverConfig = {};

function _parseCommandAndArguments(data) {
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

function _scheduleRemovalOfKeyFromMap(key, timeout) {
    setTimeout(() => {
        if(map.has(key)) {
            map.delete(key);
        }
    }, timeout);
}

function _handleRequest(data) {
    let [command, ...args] = _parseCommandAndArguments(data);
    console.log("command:" + command + " args:" + args);
    let response = "";
    switch(command){
        case "echo":
            console.log("Echoing");
            response = formatter.formatBulkString(args[0]);
            break;
        case "ping":
            console.log("Pinging");
            response = formatter.formatSimpleString("PONG");
            break;
        case "set":
            console.log("Set command");
            map.set(args[0], args[1]);
            if(args[2] === "px") {
                _scheduleRemovalOfKeyFromMap(args[0], args[3]);
            }
            response = formatter.formatSimpleString("OK");
            break;
        case "get":
            console.log("Get command");
            let val = map.get(args[0]);
            response = formatter.formatBulkString(val);
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
            break;
        default:
            console.log("Command not found");
            response = formatter.formatSimpleErrors();
    }
    return response;
}

function createServer(port, host) {
    const server = net.createServer((connection) => {
        connection.on("data", (data) => {
            let response = _handleRequest(data);
            connection.write(response);
        });
        console.log("Client connected");
    });

    server.listen(port, host, () => {
        console.log("Server started on port " + port);
    });
}

function _initMaster() {
    createServer(serverConfig.port, serverConfig.host);
}

function _initSlave() {
    let socket = new net.Socket();
    let hostId = serverConfig.master_host === "localhost" ? "127.0.0.1" : host;
    socket.connect(serverConfig.master_port, hostId);

    socket.on("connect", () => {
        console.log("Connected to master");
        let request = formatter.formatArrays(["ping"]);
        socket.write(request);
    });

    socket.on("data", (data) => {
        console.log("received from master: " + data.toString());
        createServer(serverConfig.port, serverConfig.host);
    });
}

function init(config) {
    serverConfig = config;
    if(serverConfig.role === "master") {
        _initMaster();
    } else {
        _initSlave();
    }
}

module.exports = { init };