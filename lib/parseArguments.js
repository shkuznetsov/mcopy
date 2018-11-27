'use strict';

const defaultOptions = require('./defaultOptions');
const CopyJob = require('./CopyJob');

/**
 * Synchronous function, parses and sanitises module arguments
 * @param args
 */
module.exports = function (args) {
	let jobs = [], opt, callback;
	let argIndex = 2;

	if (Array.isArray(args[0])) {
		// Ok, we're either dealing with a multi-job call or a single-job where the source is an array of strings
		if (typeof args[0][0] === 'string') {
			// So that was a single-job call with an array of strings as a source
			jobs.push(new CopyJob(args[0], args[1]));
		} else {
			// Multi-job call that was!
			args[0].forEach((jobArgs) => {
				if (Array.isArray(jobArgs)) {
					// Shorthand job arguments
					jobs.push(new CopyJob(jobArgs[0], jobArgs[1]));
				}
				else if (typeof jobArgs === 'object') {
					// Verbose job arguments
					jobs.push(new CopyJob(jobArgs.src, jobArgs.dest));
				} else {
					// Umm, fishy
					// TODO: Fail with an argument error
				}
			});
			argIndex = 1;
		}
	} else if (typeof args[0] === 'object') {
		// Looks like that was a verbose single-job call
		jobs.push(new CopyJob(args[0].src, args[0].dest));
		argIndex = 1;
	} else {
		// Right, so that was a shorthand single-job call after all
		jobs.push(new CopyJob(args[0], args[1]));
	}

	// Traversing remaining (optional) arguments
	if (typeof args[argIndex] === 'object') {
		// Ok, we've found an options object, let's sanitise it
		opt = defaultOptions(args[argIndex++]);
	}
	if (typeof args[argIndex] === 'function') {
		// This one looks like a callback
		callback = args[argIndex];
	}

	return {jobs, opt, callback};
};