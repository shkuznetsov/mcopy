'use strict';

const Events = require('events');

const parseArguments = require('./lib/parseArguments');
const defaultOptions = require('./lib/defaultOptions');
const ResolveSourcesCollection = require('./lib/ResolveSourcesCollection');
const ResolveDestinationsCollection = require('./lib/ResolveDestinationsCollection');
const CopyCollection = require('./lib/CopyCollection');

module.exports = function (...args) {
	// Parse and sanitise the inputs
	let {jobs, opt, callback} = parseArguments(args);
	opt = defaultOptions(opt);
	// This will eventually be returned
	let api = new Events();
	// Create job collections
	let sourcesCollection = new ResolveSourcesCollection(opt, api);
	let destinationsCollection = new ResolveDestinationsCollection(opt, api);
	let copyCollection = new CopyCollection(opt, api);
	// Chain the collections
	sourcesCollection.chain(destinationsCollection).chain(copyCollection);
	// run() the collection automatically...
	if (opt.autoStart) api.promise = sourcesCollection.run();
	// ...or add an API method to run() it manually
	else {
		// Intentionally use Deferred anti-pattern
		let resolve, reject;
		api.promise = new Promise((rs, rj) => {
			resolve = rs;
			reject = rj;
		});
		api.run = () => {
			sourcesCollection.run().then(resolve, reject);
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
	// Prime the sourcesCollection with the input jobs
	jobs.forEach((job) => sourcesCollection.seedJob(job));