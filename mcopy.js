'use strict';

const parseArguments = require('./lib/parseArguments');
const defaultOptions = require('./lib/defaultOptions');
const InputCollection = require('./lib/InputCollection');

module.exports = function (...args) {

	let {jobs, opt, callback} = parseArguments(args);

	opt = defaultOptions(opt);

	let emitter = new Events();

	let worker = new InputCollection(opt, emitter);

	jobs.forEach((job) => worker.addJob(job));

	let promise = worker.run();

	emitter.promise = () => promise;

	return emitter;
};


{
	// Parse inputs
	let {jobs, opt, callback} = parseArguments(args);
	// This will be returned
	let emitter = new ProgressEmitter();


	let promise = jobsCollection.run();

	// Invoke the callback
	if (callback) promise.then(value => callback(null, value), error => callback(error));
	// Bind the promise getter
	emitter.promise = () => promise;
	// Return the chainable emitter
	return emitter;
};