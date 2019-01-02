'use strict';

const defaultOptions = require('./defaultOptions');

/**
 * Synchronous function, parses and sanitises module arguments
 * @param args
 */
module.exports = function (args) {
	let jobs, opt, callback;

	if (Array.isArray(args[0]) && typeof args[0][0] !== 'string') {
		// Multi-job call
		jobs = args.shift();
	} else {
		// Single-job call
		jobs = [[args.shift(), args.shift()]];
	}

	// Is the next argument - opt?
	if (typeof args[0] === 'object') opt = args.shift();

	// Is the next argument - callback?
	if (typeof args[0] === 'function') callback = args[0];

	return {jobs, opt, callback};
};



if (Array.isArray(args[0])) {
	// Ok, we're either dealing with a multi-job call
	// or a single-job where the source is an array of strings
	if (typeof args[0][0] === 'string') {
		// So that was a single-job call with an array of globs as a source
		jobs.push(new CopyJob_PhaseZero(args[0], args[1]));
	} else {
		// Multi-job call that was!
		args[0].forEach((jobArgs) => {
			if (Array.isArray(jobArgs)) {
				// Shorthand job arguments
				jobs.push(new CopyJob_PhaseZero(jobArgs[0], jobArgs[1]));
			}
			else if (typeof jobArgs === 'object') {
				// Verbose job arguments
				jobs.push(new CopyJob_PhaseZero(jobArgs.src, jobArgs.dest));
			} else {
				// Umm, fishy
				// TODO: Fail with an argument error
			}
		});
		argIndex = 1;
	}
} else if (typeof args[0] === 'object') {
	// Looks like that was a verbose single-job call
	jobs.push(new CopyJob_PhaseZero(args[0].src, args[0].dest));
	argIndex = 1;
} else {
	// Right, so that must have been a shorthand single-job call
	jobs.push(new CopyJob_PhaseZero(args[0], args[1]));
}
