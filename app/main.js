// const http = require("http");

const express = require("express");

// Create an express app
const app = express()
app.use(express.json());

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
// const server = http.createServer((req, res) => {
//    // Handle request
// })

app.listen(6379, "127.0.0.1");
