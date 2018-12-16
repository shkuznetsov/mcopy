'use strict';

const
	glob = require('fast-glob'),
	File = require('./File');

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
				let dest = this.dest;
				if (typeof dest === 'function') dest = dest(src);
				files.push(new File(src, dest));
			});
		});
	}
};