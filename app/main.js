const net = require("net");
const formatter = require("./formatter");
const { time } = require("console");

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
            default:
                console.log("Command not found");
                response = formatter.formatSimpleErrors();
        }
        connection.write(response);
    });
    console.log("Client connected");
});


server.listen(6379, "127.0.0.1");
