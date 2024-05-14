'use strict';

const bootstrap = require('./bootstrap');

// Default configuration
const config = {
    host: "127.0.0.1",
    port: 6379,
    role: "master",
    propagated_commands: 0,
    connections: [],
    connected_replicas: [],
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
    config.master_port = parseInt(args[args.indexOf('--replicaof') + 2]);
    config.bytes_read_from_master = 0;
    delete config.propagated_commands;
    delete config.connections;
    delete config.connected_replicas;
    delete config.master_replid;
    delete config.master_repl_offset;
}

bootstrap.init(config);
