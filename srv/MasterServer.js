const net = require("net");
const { parseCommandAndArguments } = require("../util/parser");
const CommandHandler = require("./CommandHandler");


module.exports = class MasterServer {
    
    // Master configuration
    #configuration;

    // Command handler
    #commandHandler;

    // Server info
    #server_info;

    constructor(configuration) {
        this.#configuration = configuration;
        this.#server_info = {
            connections: {},
            propagated_commands: 0
        };

        this.#commandHandler = new CommandHandler(this.#configuration, this.#server_info);
    }

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
    }

    /**
     * This function is used to handle the commands from the client
     * @param {net.Socket} socket - The socket object 
     * @param {Buffer} data - The data received from the client 
     */
    #handleCommand(socket, data) {
        let [command, ...args] = parseCommandAndArguments(data.toString());
        console.log("command:" + command + " args:" + args);
        switch(command){
            case "echo":
                this.#commandHandler.echo(socket, args);
                break;
            case "ping":
                this.#commandHandler.ping(socket);
                break;
            case "set":
                this.#commandHandler.set(socket, args);
                this.#broadcastToReplicas(data);
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
            case "psync":
                this.#commandHandler.psync(socket);
                break;
            case "wait":
                this.#commandHandler.wait(socket, args);
                break;
            default:
                this.#commandHandler.defaultHandler(socket);
                break;
        }
    }

    /**
     * This function is used to broadcast data to all the slaves
     * @param {Buffer} data - The data to be sent to the slaves
     */
    #broadcastToReplicas(data) {
        this.#server_info.propagated_commands++;
        Object.values(this.#server_info.connections).forEach((socket) => {
            socket.write(data);
        });
        console.log('data sent to replicas');
    }

};