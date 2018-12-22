'use strict';

const defaults = require('defaults'),
    Machinegun = require('./lib/Machinegun.js'),
    File = require('./lib/File.js'),
    ProgressEmitter = require('./lib/ProgressEmitter.js'),
	parseArguments = require('./lib/parseArguments.js');

module.exports = function () {
	// This will be returned
	const emitter = new ProgressEmitter();
	// Parse and sanitise inputs
	let {jobs, opt, callback} = parseArguments(arguments);
	// Main worker function, returns a promise
	const promise = main(jobs, opt, emitter);
	// Invoke the callback
	if (callback) promise.then((value) => callback(null, value), error => callback(error));
	// Bind the promise getter
	emitter.promise = () => promise;
	// Return the chainable emitter
	return emitter;
};

async function main (jobs, opt, emitter) {
	const machinegun = new Machinegun(opt);
	let files = await jobsToFiles(jobs, opt, machinegun);
	let deduped = dedupFiles(files);
	return await copyFiles(deduped, opt, machinegun);
}

function jobsToFiles (jobs, opt, machinegun) {
	let files = [];
	// Load up the machinegun with Jobs-to-Files conversion tasks
	jobs.forEach((job) => machinegun.load(async () => files.push(...await job.toFiles(opt))));
	// Fire the machinegun and return the promise resolving to the files list
	return machinegun.fire().promise(files);
}



	// Init the machinegun
	let mg = new Machinegun({
		barrels: opt.parallel,
		giveUpOnError: opt.stopOnError,
		ceaseFireOnEmpty: true,
		fireImmediately: false
	});

	mg.on('error', (err) => {
		if (!opt.failOnError) {
			emitter.emit('error', err);
			errored = true;
		}
	});



	function dedupFiles (files) {
		let bySrc = {}, byDest = {};
		files.forEach((file) => {
			// Is it a source duplicate?
			if (!bySrc[file.src]) {
				// Only add it if wasn't a complete duplicate
				if (file.dest != bySrc[file.src][0].dest) {
					bySrc[file.src].push(file);
				}
			} else {
				// Create the first entry
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