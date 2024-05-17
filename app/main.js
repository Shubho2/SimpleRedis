'use strict';

const bootstrap = require('./bootstrap');

// Default configuration
const config = {
    host: "127.0.0.1",
    port: 6379,
    role: "master",
    master_replid: "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb",
    master_repl_offset: 0
}

const args = process.argv.slice(2);

if(args.includes('--port')) {
    config.port = args[args.indexOf('--port') + 1];
}

if(args.includes('--replicaof')) {
    config.role = "slave";
    let master_config = args[args.indexOf('--replicaof') + 1].split(' ');
    config.master_host = master_config[0] === 'localhost' ? '127.0.0.1' : master_config[0];
    config.master_port = parseInt(master_config[1]);
    delete config.master_replid;
    delete config.master_repl_offset;
}

bootstrap.init(config);
