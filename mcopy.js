'use strict';

const defaults = require('defaults'),
    Machinegun = require('../machinegun/index.js'),
    File = require('./lib/File.js'),
    ProgressEmitter = require('./lib/ProgressEmitter'),
	parseArguments = require('./lib/parseArguments');

module.exports = function () {

	let mg, errored;

	// This will be returned
	const emitter = new ProgressEmitter();

	// Parse and sanitise inputs
	let {jobs, opt, callback} = parseArguments(arguments);

		mg = new Machinegun({
			barrels: opt.parallel,
			giveUpOnError: opt.failOnError,
			ceaseFireOnEmpty: true,
			fireImmediately: false
		});

		mg.on('error', (err) => {
			if (!opt.failOnError) {
				emitter.emit('error', err);
				errored = true;
			}
		});

		resolve(opt.files.map((file) => File.createFromArgument(file, opt, emitter)));
	});

	const resolveGlobs = (inputFiles) => {
		const resolvedFiles = [];
		inputFiles.forEach((file) => mg.load(() => file.resolveGlob().then((files) => Array.prototype.push.apply(resolvedFiles, files))));
		return mg.fire().promise(resolvedFiles);
	};

	const statFiles = (inputFiles) => {
		const statFiles = [];
		inputFiles.forEach((file) => mg.load(() => file.stat().then((file) => statFiles.push(file))));
		return mg.fire().promise(statFiles);
	};

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

	parseInput(arguments)
		.then(resolveGlobs)
		.then(statFiles)
		.then(copyFiles)
		.then(reportComplete, reportComplete);

	return emitter;
};