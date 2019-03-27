/**
 * Synchronous function, parses module arguments, never throws
 * @param {Array} args
 * @return {Object}
 */
module.exports = function (args) {
	let jobs, opt, callback;

	// Was this a multi-job call?
	if (Array.isArray(args[0]) && typeof args[0][0] !== 'string') jobs = args.shift();
	// ... nope, single-job call that was
	else jobs = [[args.shift(), args.shift()]];

	// Is the next argument - opt?
	if (typeof args[0] === 'object') opt = args.shift();

	// Is the next argument - callback?
	if (typeof args[0] === 'function') callback = args[0];

	return {jobs, opt, callback};
};