'use strict';

/**
 * This function is used to parse the command and arguments from the data received from the client
 * @param {Buffer} response - The response received from the client 
 * @returns {[String]} - The command and arguments
 */
function parseCommandAndArguments(response) {
    let args = response.toLowerCase().split("\r\n");
    args.shift();
    let result = [];
    for(let i = 0; i < args.length; i++){
        if(i%2 == 1) {
            result.push(args[i])
        }
    }
    return result;
}



module.exports = {
    parseCommandAndArguments
};