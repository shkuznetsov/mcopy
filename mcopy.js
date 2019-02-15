'use strict';

import {defaultOptions} from './lib/defaultOptions';
import {jobsFactory} from './lib/JobsAndCollections';

const
	ProgressEmitter = require('./lib/ProgressEmitter.js');

module.exports = function () {

	// Inputs parsing
	let jobs, opt, callback;
	// Was this a multi-job call?
	if (Array.isArray(args[0]) && typeof args[0][0] !== 'string') jobs = args.shift();
	else jobs = [[args.shift(), args.shift()]];
	// Is the next argument - opt?
	if (typeof args[0] === 'object') opt = defaultOptions(args.shift());
	// Is the next argument - callback?
	if (typeof args[0] === 'function') callback = args[0];

	// This will be returned
	let emitter = new ProgressEmitter();

	let jobsCollection = new JobsCollection(jobs, opt, emitter);

	let promise = jobsCollection.run();

	// Invoke the callback
	if (callback) promise.then(value => callback(null, value), error => callback(error));
	// Bind the promise getter
	emitter.promise = () => promise;
	// Return the chainable emitter
	return emitter;
};





function jobsToFiles (jobs, opt, machinegun) {
	let files = [];
	// Load up the machinegun with Jobs-to-Files conversion tasks
	jobs.forEach((job) => machinegun.load(async () => files.push(...await job.toFiles(opt))));
	// Fire the machinegun and return the promise resolving to the files list
	return machinegun.fire().promise(files);
}

function dedupFiles (files) {
	let bySrc = {}, byDest = {};
	files.forEach((file) => {
		// Is it a source duplicate?
		if (bySrc[file.src]) {
			// Return if this is a complete duplicate of an existing file
			for(let i in bySrc[file.src]) if (bySrc[file.src][i].dest == file.dest) return;
			// ... or if not, add it in
			bySrc[file.src].push(file);
		} else {
			bySrc[file.src] = [file];
		}
		// Is it a destination duplicate?
		if (byDest[file.dest]) {
			// TODO: Fail with destination duplicate error
		} else {
			byDest[file.dest] = true;
		}
	});
	return bySrc;
}

	const copyFiles = (inputFiles) => {
		inputFiles.forEach((file) => mg.load(() => {
			let promise = file.prepareDestination().then((file) => file.copy());
			// Add deletion to the promise chain only if opt.deleteSource is truthy
			if (opt.deleteSource) promise = promise.then((file) => file.deleteSource());
			// Abort copying if the whole machinegun gives up
			mg.on('giveUp', () => file.abort());
			return promise;
		}));
		return mg.fire().promise();
	};

	const reportComplete = (err) => {
		if (err && emitter.listenerCount('error')) emitter.emit('error', err);
		if (!errored && !err) emitter.emit('success');
		emitter.emit('complete');
		if (typeof opt.callback == 'function') opt.callback(err);
	};



	return emitter;
};

/*
Parse inputs >>
	CopyJob_PhaseZero: [array of globs] => string|function
Resolve globs >>
	CopyJob_PhaseOne: string+stat => string|function
Resolve destinations >>
	CopyJob_PhaseTwo: string+stat => string
Deduplicate and combine sources >>
	CopyJob_PhaseThree: string+stat => [array of strings]

 */