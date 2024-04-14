const net = require("net");

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
            default:
                console.log("Command not found");
        }
    });
    console.log("Client connected");
  });


server.listen(6379, "127.0.0.1");
