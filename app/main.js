const net = require("net");

let map = new Map();

const server = net.createServer((connection) => {
    connection.on("data", (data) => {
        let args = data.toString().toLowerCase().split("\r\n");
        console.log(args);
        switch(args[2]){
            case "echo":
                console.log("Echoing");
                connection.write(args[3] + "\r\n" + args[4] + "\r\n");
                break;
            case "ping":
                console.log("Pinging");
                connection.write("+PONG\r\n");
                break;
            case "set":
                console.log("Set command");
                map.set(args[4], args[6]);
                connection.write("+OK\r\n");
                break;
            case "get":
                console.log("Get command");
                let val = map.get(args[4]);
                if(val === undefined){
                    connection.write("$-1\r\n");
                } else {
                    connection.write(`$${val.length}\r\n${val}\r\n`);
                }
            default:
                console.log("Command not found");
        }
    });
    console.log("Client connected");
  });


server.listen(6379, "127.0.0.1");
