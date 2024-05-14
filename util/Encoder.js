// This file contains the encoder functions for the redis protocol

module.exports = class Encoder {

    static encodeSimpleString(string) {
        return `+${string}\r\n`;
    }

    static encodeBulkString(string) {
        if(string === undefined){
            return "$-1\r\n";
        }
        return `$${string.length}\r\n${string}\r\n`;
    }

    static encodeArray(arr) {
        let response = `*${arr.length}\r\n`;
        for(let i = 0; i < arr.length; i++){
            response += Encoder.encodeBulkString(arr[i]);
        }
        return response;
    }

    static encodeInteger(integer) {
        return `:${integer}\r\n`;
    }

    static encodeSimpleError() {
        return "-ERR unknown command\r\n";
    }

}
