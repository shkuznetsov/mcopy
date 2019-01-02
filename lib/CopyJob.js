'use strict';

const
	glob = require('fast-glob'),
	File = require('./File.js');

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

	toFiles (opt) {
		glob(this.src, opt.globOpt).then((srcs) => {
			let files = [];
			srcs.forEach((src) => {
				// If dest is a function, it needs to be called to get a string or a boolean value
				let dest = (typeof this.dest === 'function') ? this.dest(src) : this.dest;
				// If dest is falsy the file will not be created
				if (dest) files.push(new File(src, dest));
			});
		});
	}
};