'use strict';

const
	glob = require('fast-glob'),
	CopyJob_PhaseOne = require('./CopyJob_PhaseOne.js');

module.exports = class CopyJob_PhaseZero {
	constructor (src, dest, opt) {
		// Source should either be a string or an array of strings
		if (typeof src === 'string') this.src = [src];
		else if (Array.isArray(src)) this.src = src;
		else {} // TODO: Fail with an argument error
		// Dependency injection
		this.opt = opt;
	}

	factory () {
		glob(this.src, this.opt.globOpt).then((srcs) => {
			let jobs = [];
			srcs.forEach((src) => {
				try {
					// This may throw if the arguments aren't valid
					jobs.push(new CopyJob_PhaseOne(src, this.dest, this.opt));
				} catch (e) {
					// If a single file error should lead to a failure, rethrow
					if (this.opt.failOnError) throw e;
				}
			});
			return jobs;
		});
	}
};