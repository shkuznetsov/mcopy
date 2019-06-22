const EventEmitterChainable = require('./EventEmitterChainable');

/**
 * Base class for the jobs collections
 * @type {JobsCollectionChainable}
 */
module.exports = class JobsCollectionChainable extends EventEmitterChainable {

	constructor (opt) {
		super();
		this.opt = opt;
		this.jobs = [];
		this.result = [];
		this.chained = false;
	}

	/**
	 * Jobs management
	 */

	pushJob (job) {
		this.jobs.push(job);
	}

	seedJob (seed) {
		try {
			let job = this.newJob(seed);
			if (job) this.pushJob(job);
		} catch (err) {
			this.handleError(err);
		}
	}

	// Should return runnable
	newJob (seed) {
		throw new Error('Should implement newJob()');
	}

	/**
	 * Collection execution and chaining methods
	 */

	run () {
		// A collection can only be executed once
		// Subsequent executions will return the same promise
		if (!this.promise) this.promise = new Promise((resolve, reject) => {
			let running = 0, rejected = false;
			let proceed = () => {
				// Only proceed if the promise hasn't yet been rejected
				if (!rejected) {
					// Start required number of jobs up to the concurrency limit
					// TODO: catch exception that might be caused by an undefined opt
					while (this.jobs.length && (running < this.opt.concurrency || !this.opt.concurrency)) {
						running++;
						// TODO: catch exception that might be caused by a non-runnable job
						this.jobs.shift().run().then((res) => {
							running--;
							// Is the job result an array?
							if (Array.isArray(res)) {
								this.result.push(...res);
								// TODO: catch exception that might be caused by an undefined this.chained.seedJob()
								if (this.chained) res.forEach((r) => this.chained.seedJob(r));
							}
							// Is the job result defined?
							else if (typeof res !== 'undefined') {
								this.result.push(res);
								// TODO: catch exception that might be caused by an undefined this.chained.seedJob()
								if (this.chained) this.chained.seedJob(res);
							}
							proceed();
						}, (err) => {
							running--;
							// TODO: catch exception that might be caused by an undefined opt
							if (!this.opt.failOnError) this.emit('warning', err);
							else if (!rejected) {
								rejected = true;
								reject(err);
							}
							proceed();
						});
					}
					// If nothing is running at this point, this collection is done
					// TODO: catch exception that might be caused by a non-runnable this.chained
					if (!running) resolve(this.chained ? this.chained.run() : this.result);
				}
			};
			// Trigger the chain reaction
			proceed();
		});
		return this.promise;
	}

	chain (collection) {
		// For now this (unlike the superclass) allows one chained collection only
		// TODO: Think how this may be changed, what should be an API paradigm
		this.chained = collection;
		return super.chain(collection);
	}

	handleError (err) {
		if (this.opt.failOnError) throw err;
		else this.emit('warning', err);
	}
};