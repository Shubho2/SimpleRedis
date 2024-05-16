
const Encoder = require("../util/Encoder");
var Cache = require("../db/Cache");

/**
 * This class is used to handle the commands from the client
 */
module.exports = class CommandHandler {

    #configuration;
    #cache;
    #ackRecieved;

    constructor(configuration) {
        this.#configuration = configuration;
        this.#cache = new Cache();
        this.#ackRecieved = 0;
    }

    get configuration() {
        return this.#configuration;
    }

    echo(socket, args) {
        console.log("Echoing");
        // If the client is not the master, then send the response back to the client
        if (socket.remotePort !== this.#configuration.master_port) {
            this.#writeToSocket(socket, Encoder.encodeBulkString(args[0]));
        }
    }

    ping(socket) {
        console.log("Got a ping from client port: " + socket.remotePort);
        // If the client is not the master, then send the response back to the client
        if (socket.remotePort !== this.#configuration.master_port) {
            this.#writeToSocket(socket, Encoder.encodeSimpleString("PONG"));
        }
    }
    
    set(socket, args) {
        console.log("Setting key value pair in cache");
        this.#cache.set(...args);

        // If the client is not the master, then send the response back to the client
        if(socket.remotePort !== this.#configuration.master_port) {
            this.#writeToSocket(socket, Encoder.encodeSimpleString("OK"));
        }
    }

    get(socket, args) {
        console.log("Fetching value from cache");
        let val = this.#cache.get(args[0]);
        this.#writeToSocket(socket, Encoder.encodeBulkString(val));
    }

    info(socket, args) {
        console.log("Info command");
        if(args[0] === "replication") {
            let responseString = `role:${this.#configuration.role}`
            let response;
            if(this.#configuration.role === "master") {
                response = Encoder.encodeBulkString(responseString + '\r\n' +
                `master_replid:${this.#configuration.master_replid}\r\n` +
                `master_repl_offset:${this.#configuration.master_repl_offset}\r\n`);
            } else {
                response = Encoder.encodeBulkString(responseString);
            }
            this.#writeToSocket(socket, response);
        }
    }

    replconf(socket, args) {
        console.log("Replconf command");

        let response;
        if(args[0] === "listening-port") {
            // Command recieved by the master from replica
            // saving the socket object for future use, instead of the port. 
            this.#configuration.connected_replicas.push(args[1]);
            this.#configuration.connections.push(socket);
            response = Encoder.encodeSimpleString("OK");
        } else if(args[0] == 'capa') {
            // Command recieved by the master from replica
            response = Encoder.encodeSimpleString("OK");
        } else if(args[0] === "getack") {
            // Command recieved by the replica from master
            response = Encoder.encodeArray(['REPLCONF', 'ACK', this.#configuration.bytes_read_from_master.toString()]);
        } else if (args[0] === "ack"){
            // Command recieved by the master from replica
            response = null;
            this.#ackRecieved++;
        }

        this.#writeToSocket(socket, response);
    }

    psync(socket) {
        console.log("Psync command");
        let response = Encoder.encodeSimpleString(`FULLRESYNC ${this.#configuration.master_replid} ${this.#configuration.master_repl_offset}`);
        this.#writeToSocket(socket, response);
        response = this.#getRDBFileBuffer();
        this.#writeToSocket(socket, response);
        console.log(`RDB file sent: ${response}`);
    }

    wait(socket, args) {
        console.log("wait command");
        let response;
        if (this.#configuration.propagated_commands === 0) {
            console.log("No propagated commands. So sending the number of connected replicas.");
            this.#writeToSocket(socket, Encoder.encodeInteger(this.#configuration.connected_replicas.length));
            this.#ackRecieved = 0;
        } else {
            this.#configuration.connections.forEach((socket) => {
                console.log("Sending REPLCONF GETACK *");
                socket.write(Encoder.encodeArray(['REPLCONF', 'GETACK', '*']));
                // Doesn't need register an event listener for the data event, as the data event is already being listen to
                // while server is created. The response is handled in replconf() method.
            });

            setTimeout( () => {
                this.#writeToSocket(socket, Encoder.encodeInteger(this.#ackRecieved));
                this.#ackRecieved = 0;
            }, args[1]);
            this.#configuration.propagated_commands = 0;
        }
    }

    defaultHandler(socket) {
        console.log("Unknown command");
        if(socket.remotePort !== this.#configuration.master_port) {
            this.#writeToSocket(socket, Encoder.encodeSimpleError());
        }
    }

    // ------------------ Private methods ------------------

    /**
     * This function is used to generate a dummy RDB file
     * @returns {Buffer} - The buffer containing the RDB file
     */
    #getRDBFileBuffer() {
        const empty_rdb_base64 = "UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==";
        const rdbBuffer = Buffer.from(empty_rdb_base64, "base64");
        const rdbHead = Buffer.from(`$${rdbBuffer.length}\r\n`);
        return Buffer.concat([rdbHead,rdbBuffer]);
    }

    #writeToSocket(socket, response) {
        if(response !== null) {
            socket.write(response);
        }
    }
}