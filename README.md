# Introduction
A simple redis server is being built to serve basic commands. It creates master and replica servers through socket connections for communication and distribute state data. Redis-cli can be used to communicate with the server.

## How to build and run this project

1. Ensure you have `node` installed locally
3. Run `brew install redis` in MacOS terminal to install redis-cli.
4. Run `./spawn_redis_server.sh` to run your Redis server, which is implemented in `app/main.js`.
5. Use redis-cli to execute your redis commands.

*Please check alternatives of `brew install redis` for other OS*
