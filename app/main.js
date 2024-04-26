const server = require('../srv/server');

// Default configuration
const config = {
    host: "127.0.0.1",
    port: 6379,
    role: "master",
    connections: [],
    connected_slaves: [],
    master_replid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",
    master_repl_offset: 0
}

const args = process.argv.slice(2);

if(args.includes('--port')) {
    config.port = args[args.indexOf('--port') + 1];
}

if(args.includes('--replicaof')) {
    config.role = "slave";
    config.master_host = args[args.indexOf('--replicaof') + 1] === 'localhost' ? '127.0.0.1' : args[args.indexOf('--replicaof') + 1];
    config.master_port = args[args.indexOf('--replicaof') + 2];
    delete config.connections;
    delete config.connected_slaves;
    delete config.master_replid;
    delete config.master_repl_offset;
}

server.init(config);
