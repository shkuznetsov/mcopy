'use strict';

const
	glob = require('fast-glob'),
	File = require('./File.js');

module.exports = class CopyJob_PhaseZero {
	constructor (src, dest, opt) {
		// Source should either be a string or an array of strings
		if (typeof src === 'string') this.src = [src];
		else if (Array.isArray(src)) this.src = src;
		else {} // TODO: Fail with an argument error
		// Destination should either be a string or a function
		if (typeof dest === 'string' || typeof dest === 'function') this.dest = dest;
		else {} // TODO: Fail with an argument error
		// Dependency injection
		this.opt = opt;
	}

	factory () {
		glob(this.src, this.opt.globOpt).then((srcs) => {
			let jobs = [];
			srcs.forEach((src) => {
				// If dest is a function, it needs to be called to get a string or a boolean value
				let dest = (typeof this.dest === 'function') ? this.dest(src) : this.dest;
				// If dest is falsy the file will not be created
				if (dest) try {
					// This may throw if the arguments aren't valid
					jobs.push(new CopyJob_PhaseOne(src, dest, opt));
				} catch (e) {
					// If a single file error should lead to a failure, rethrow
					if (this.opt.failOnError) throw e;
				}
			});
			return jobs;
		});
	}
};