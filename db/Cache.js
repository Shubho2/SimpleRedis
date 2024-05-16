'use strict';

module.exports = class Cache {
    
    // InMemory cache
    #map;

    constructor() {
        this.#map = new Map();
    }

    /**
     * This function is used to set a key value pair in the cache
     * @param {String} key - The key to be set
     * @param {String} value - The value to be set
     * @param {Number} timeout - The timeout after which the key should be removed
     */
    set(key, value, px, timeout) {
        console.log("Setting key " + key + " in cache at " + Date.now());
        this.#map.set(key, value);
        if(timeout !== undefined) {
            this.#setExpiry(key, timeout);
        }
    }

    /**
     * This function is used to get the value of a key from the cache
     * @param {String} key - The key to be fetched
     * @returns {String} - The value of the key
     */
    get(key) {
        console.log("Fetching key " + key + " from cache at " + Date.now());
        return this.#map.get(key); 
    }

    /**
     * This function is used to delete a key from the cache after a timeout
     * @param {String} key - The key to be deleted
     * @param {Number} timeout - The timeout after which the key should be removed
     */
    #setExpiry(key, timeout) {
        setTimeout(() => {
            if(this.#map.has(key)) {
                this.#map.delete(key);
                console.log("Key " + key + " has been deleted from cache at " + Date.now());
            }
        }, parseInt(timeout));
    }
};