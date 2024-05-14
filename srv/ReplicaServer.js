const net = require("net");
const { parseCommandAndArguments } = require("../util/parser");
const Encoder = require("../util/Encoder");
const CommandHandler = require("./CommandHandler");

module.exports = class ReplicaServer {
  
  // Replica configuration
  #configuration;
  #commandHandler;

  constructor(configuration) {
    this.#configuration = configuration;
    this.#commandHandler= new CommandHandler(configuration);
  }

  /** 
   * This function is used to start a replica server.
  */
  startServer() {
      const server = net.createServer((socket) => {
          socket.on("data", (data) => {
            console.log("Data came to " + this.#configuration.role + " server");
            this.#handleCommand(socket, data);
          });
          console.log(this.#configuration.role + " server is created");
      });

      server.on("error", (err) => {
          console.log(err);
      });

      server.listen(this.#configuration.port, this.#configuration.host, () => {
          console.log(this.#configuration.role + " server started on port " + this.#configuration.port);
      });

      this.#handshakeWithMaster();
  }

  /**
   * This function is used to handle the request from the client
   * @param {net.Socket} socket - The socket object
   * @param {Buffer} data - The data received from the client
   */
  #handleCommand(socket, data) {
    let [command, ...args] = parseCommandAndArguments(data);
    console.log("command:" + command + " args:" + args);
    switch (command) {
      case "echo":
        this.#commandHandler.echo(socket, args);
        break;
      case "ping":
        this.#commandHandler.ping(socket);
        break;
      case "set":
        this.#commandHandler.set(socket, args);
        break;
      case "get":
        this.#commandHandler.get(socket, args);
        break;
      case "info":
        this.#commandHandler.info(socket, args);
        break;
      case "replconf":
        this.#commandHandler.replconf(socket, args);
        break;
      default:
        this.#commandHandler.defaultHandler(socket);
        break;
    }
  }

  /**
   * This function is used to handshake with the master server.
   */
  #handshakeWithMaster() {
    let socket = net.createConnection(
      this.#configuration.master_port,
      this.#configuration.master_host
    );

    socket.on("connect", () => {
      console.log("Connected to master");
      socket.write(Encoder.encodeArray(["ping"]), "utf8");
    });

    // This is a flag to ensure that we only send the capabilities once
    // TODO: This is a hacky way to do this. Find a better way. Can we use a state machine? CSP?
    let capabilitiesDidSend = false;

    socket.on("data", (data) => {
      console.log("received from master: " + data.toString());

      if (data.toString() === "+PONG\r\n") {
        socket.write(
          Encoder.encodeArray([
            "REPLCONF",
            "listening-port",
            this.#configuration.port,
          ]),
          "utf8"
        );
      } else if (data.toString() === "+OK\r\n") {
        if (!capabilitiesDidSend) {
          socket.write(
            Encoder.encodeArray(["REPLCONF", "capa", "psync2"]),
            "utf8",
            (err) => {
              if (err) {
                console.log("Error writing to master");
              } else {
                console.log("Sent capabilities to master");
                capabilitiesDidSend = true;
              }
            }
          );
        } else {
          console.log("Handshake successful");
          socket.write(Encoder.encodeArray(["PSYNC", "?", "-1"]), "utf8");
        }
      } else if (data.toString().includes("*")) {
        console.log("Handling propagated data " + data.toString());
        let commands = data.toString();

        // Trimming the RDB file content from the data
        commands = commands.substring(commands.indexOf("*"));

        while (commands.length > 0) {
          let index = commands.indexOf("*", 1);
          let command;
          if (index == -1) {
            command = commands;
            commands = "";
          } else {
            command = commands.substring(0, index);
            commands = commands.substring(index);
          }
          console.log("Handling command: " + command);
          this.#handleCommand(socket, command);

          // Incrementing the bytes read from the master after handling the query
          this.#configuration.bytes_read_from_master += command.length;
          console.log("bytes_read: " + this.#configuration.bytes_read_from_master);
        }
      }
    });
  }
};
