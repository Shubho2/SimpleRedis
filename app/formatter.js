// This file contains the formatter functions for the redis protocol

function formatSimpleString(string) {
  return `+${string}\r\n`;
}

function formatBulkString(string) {
    if(string === undefined){
        return "$-1\r\n";
    }
    return `$${string.length}\r\n${string}\r\n`;
}

function formatSimpleErrors() {
    return "-ERR unknown command\r\n";
}


module.exports = {
    formatSimpleString,
    formatBulkString,
    formatSimpleErrors  
};
