'use strict';

module.exports = class CopyJob {
	constructor (src, dest) {
		// Source should either be a string or an array of strings
		if (typeof src === 'string') this.src = [src];
		else if (Array.isArray(src)) this.src = src;
		else {} // TODO: Fail with an argument error
		// Destination should either be a string or a function
		if (typeof dest === 'string' || typeof dest === 'function') this.dest = dest;
		else {} // TODO: Fail with an argument error
	}
};