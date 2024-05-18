const net = require("net");
const { parseCommandAndArguments } = require("../util/parser");
const Encoder = require("../util/Encoder");
const CommandHandler = require("./CommandHandler");

module.exports = class ReplicaServer {
  
  // Replica configuration
  #configuration;

  // Command handler
  #commandHandler;

  // Server info
  #server_info;

  constructor(configuration) {
    this.#configuration = configuration;
    this.#server_info = {
      bytes_read_from_master: 0
    };

    this.#commandHandler= new CommandHandler(configuration, this.#server_info);
  }

  /** 
   * This function is used to start a replica server.
  */
  startServer() {
      const server = net.createServer((socket) => {
          socket.on("data", (data) => {
            console.log("Data came to " + this.#configuration.role + " server");
            let [command, ...args] = parseCommandAndArguments(data.toString());
            this.#handleCommand(socket, command, args);
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
   * @param {Buffer} command - The command received from the client
   * @param {[String]} args - The arguments of the command received from the client
   */
  #handleCommand(socket, command, args) {
    console.log("Handling command:" + command + " args:" + args);
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
    let socket = net.createConnection (
      this.#configuration.master_port,
      this.#configuration.master_host
    );

    socket.on("connect", () => {
      console.log("Connected to master");
      this.#writeEncodedArrayToSocket(socket, ['PING']);
    });

    // This is a flag to ensure that we only send the capabilities once
    // TODO: This is a hacky way to do this. Find a better way. Can we use a state machine? CSP?
    let capabilitiesDidSend = false;

    socket.on("data", (data) => {
      let response = data.toString();
      console.log("received from master: " + response);

      if (response === "+PONG\r\n") {

        this.#writeEncodedArrayToSocket(socket, ["REPLCONF", "listening-port", this.#configuration.port]);

      } else if (response === "+OK\r\n") {

        if (!capabilitiesDidSend) {
          this.#writeEncodedArrayToSocket(socket, ["REPLCONF", "capa", "psync2"]);
          console.log("Sent capabilities to master");
          capabilitiesDidSend = true;
        } else {
          console.log("Handshake successful");
          this.#writeEncodedArrayToSocket(socket, ["PSYNC", "?", "-1"]);
        }

      } else if (response.includes("*")) {
        console.log("Handling propagated data " + response);
        let commands = response;

        // Trimming the RDB file content from the data if it is present
        commands = commands.substring(commands.indexOf("*"));

        while (commands.length > 0) {
          let commandAndArgs, bytes_processed = 0;
          [commands, commandAndArgs] = this.#extractCommandAndArguments(commands);
          bytes_processed += commandAndArgs.length;
          let [command, ...args] = parseCommandAndArguments(commandAndArgs);
          
          if(args[0] === 'getack') {
            [commands, commandAndArgs] = this.#extractCommandAndArguments(commands);
            bytes_processed += commandAndArgs.length;
            args[1] = commandAndArgs[0];
          }
          
          this.#handleCommand(socket, command, args);

          // Incrementing the bytes read from the master after handling the query
          this.#server_info.bytes_read_from_master += bytes_processed;
          console.log("bytes_read: " + this.#server_info.bytes_read_from_master);
        }
      }
    });
  }


  #extractCommandAndArguments(commands) {
      let index = commands.indexOf("*", 1);
      let commandAndArgs;
      if (index == -1) {
        commandAndArgs = commands;
        commands = "";
      } else {
        commandAndArgs = commands.substring(0, index);
        commands = commands.substring(index);
      }

      return [commands, commandAndArgs];
  }



  /**
   * This function is used to write the encoded array to the socket
   * @param {net.Socket} socket - The socket object
   * @param {[String]} arr - The array to be encoded and written to the socket
   */
  #writeEncodedArrayToSocket(socket, arr) {
      let response = Encoder.encodeArray(arr);
      socket.write(response, "utf8");
  }
};
