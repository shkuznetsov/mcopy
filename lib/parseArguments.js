/**
 * Synchronous function, parses module arguments, never throws
 * @param {Array} args
 * @return {Object}
 */
module.exports = function (args) {
	let jobs, opt, callback;

	// Is this a multi-job call?
	if (Array.isArray(args[0]) && typeof args[0][0] !== 'string') jobs = args.shift();
	// May the first argument be a job object?
	else if (!Array.isArray(args[0]) && typeof args[0] === 'object') jobs = [args.shift()];
	// Nope, that was a single-job shorthand call
	else jobs = [[args.shift(), args.shift()]];

	// May the next argument be `opt`?
	if (typeof args[0] === 'object') opt = args.shift();

	// May the next argument be `callback`?
	if (typeof args[0] === 'function') callback = args[0];

	return {jobs, opt, callback};
};