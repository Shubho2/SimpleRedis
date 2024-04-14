const net = require("net");

const server = net.createServer((connection) => {
    connection.on("data", (data) => {
      console.log(data.toString());
      connection.write("+PONG\r\n");
    });

  });


server.listen(6379, "127.0.0.1");
