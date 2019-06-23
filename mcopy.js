'use strict';

const parseArguments = require('./lib/parseArguments');
const defaultOptions = require('./lib/defaultOptions');
const ResolveSourcesCollection = require('./lib/ResolveSourcesCollection');
const ResolveDestinationsCollection = require('./lib/ResolveDestinationsCollection');
const CopyCollection = require('./lib/CopyCollection');

module.exports = function (...args) {
	// Parse the inputs
	let {jobs, opt} = parseArguments(args);
	// Sanitise the options
	opt = defaultOptions(opt);
	// Create job collections
	let sourcesCollection = new ResolveSourcesCollection(opt);
	let destinationsCollection = new ResolveDestinationsCollection(opt);
	let copyCollection = new CopyCollection(opt);
	// Chain the collections
	sourcesCollection.chain(destinationsCollection).chain(copyCollection);
	// Prime the sourcesCollection with the input jobs
	jobs.forEach((job) => sourcesCollection.seedJob(job));
	// Return the collection
	return sourcesCollection;
};