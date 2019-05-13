'use strict';

const Events = require('events');

const parseArguments = require('./lib/parseArguments');
const defaultOptions = require('./lib/defaultOptions');
const JobsCollection = require('./lib/ResolveSourcesCollection');

module.exports = function (...args) {
	// Parse and sanitise the inputs
	let {jobs, opt, callback} = parseArguments(args);
	opt = defaultOptions(opt);
	// This will eventually be returned
	let api = new Events();
	// Create a collection of copy jobs
	let collection = new JobsCollection(jobs, opt, api);
	// run() the collection automatically...
	if (opt.autoStart) {
		api.promise = collection.run();
	}
	// ...or add an API method to run() it manually
	else {
		// Intentionally use Deferred anti-pattern
		let resolve, reject;
		api.promise = new Promise((rs, rj) => {
			resolve = rs;
			reject = rj;
		});
		api.run = () => {
			collection.run().then(resolve, reject);
			return api.promise;
		};
	}
	// Re-emit the promise state
	api.promise.then((result) => api.emit('success', result), (error) => api.emit('error', error));
	// Hook in a callback if it was provided
	if (callback) api.promise.then((result) => callback(null, result), (err) => callback(err));
	// Return created API object
	return api;
};