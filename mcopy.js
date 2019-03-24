'use strict';

const defaultOptions = require('./lib/defaultOptions');
const InputCollection = require('./lib/InputCollection');

const
	ProgressEmitter = require('./lib/ProgressEmitter.js');

module.exports = function (...args) {
	// Inputs parsing
	let jobs, opt, callback;
	// Was this a multi-job call?
	if (Array.isArray(args[0]) && typeof args[0][0] !== 'string') jobs = args.shift();
	else jobs = [[args.shift(), args.shift()]];
	// Is the next argument - opt?
	if (typeof args[0] === 'object') opt = defaultOptions(args.shift());
	else opt = defaultOptions();
	// Is the next argument - callback?
	if (typeof args[0] === 'function') callback = args[0];

	// This will be returned
	let emitter = new ProgressEmitter();

	let jobsCollection = new InputCollection(jobs, opt, emitter);

	let promise = jobsCollection.run();

	// Invoke the callback
	if (callback) promise.then(value => callback(null, value), error => callback(error));
	// Bind the promise getter
	emitter.promise = () => promise;
	// Return the chainable emitter
	return emitter;
};