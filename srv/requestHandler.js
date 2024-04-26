const formatter = require('../helperFunctions/formatter');

let map = new Map();

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

function bufferRDBFile() {
    const empty_rdb_base64 = "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==";
    const rdbBuffer = Buffer.from(empty_rdb_base64, "base64");
    const rdbHead = Buffer.from(`$${rdbBuffer.length}\r\n`);
    return Buffer.concat([rdbHead,rdbBuffer]);
}

function handleRequest(socket, data, serverConfig) {
    let [command, ...args] = _parseCommandAndArguments(data);
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
                _scheduleRemovalOfKeyFromMap(args[0], args[3]);
            }
            response = formatter.formatSimpleString("OK");
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
            serverConfig.connected_slaves = serverConfig.connected_slaves + 1;
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
        default:
            console.log("Command not found");
            response = formatter.formatSimpleErrors();
            socket.write(response);
    }
}

module.exports = { handleRequest };