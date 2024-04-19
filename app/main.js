const net = require("net");
const formatter = require("./formatter");

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

const server = net.createServer((connection) => {
    connection.on("data", (data) => {
        
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
                    if(isMaster) {
                        response = formatter.formatBulkString("role:master\r\n" +
                        "master_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb\r\n" +
                        "master_repl_offset:0\r\n");
                    } else {
                        response = formatter.formatBulkString("role:slave");
                    }
                }
                break;
            default:
                console.log("Command not found");
                response = formatter.formatSimpleErrors();
        }
        connection.write(response);
    });
    console.log("Client connected");
});

const isMaster = !process.argv.includes('--replicaof');

if(process.argv[2] == "--port") {
    server.listen(process.argv[3], "127.0.0.1");
} else {
    server.listen(6379, "127.0.0.1");
}
