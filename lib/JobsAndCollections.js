const Machinegun = require('machinegun');

/**
 * Base class for the jobs collections
 * @type {JobsCollection}
 */
class JobsCollection {

	constructor (opt, emitter) {
		this.opt = opt;
		this.emitter = emitter;
		this.jobs = [];
		this.result = [];
	}

	//
	// Jobs management methods
	//

	addJob (seed) {
		try {
			let job = this.newJob(seed);
			if (job) this.jobs.push(job);
		} catch (err) {
			if (this.opt.failOnError) throw err;
			else this.emitter.emit('warning', err);
		}
	}

	addJobs (seeds) {
		seeds.forEach((seed) => this.addJob(seed));
	}

	// Should return runnable
	newJob (seed) {
		return {
			run: () => Promise.resolve()
		};
	}

	//
	// Collection execution and chaining methods
	//

	run () {
		// A collection can only be executed once
		// Subsequent executions will return the same promise
		if (!this.promise) this.promise = new Promise((resolve, reject) => {
			let running = 0;
			let proceed = () => {
				// Only proceed if the promise hasn't been settled yet
				if (!settled) {
					// Start required number of jobs to the concurrency limit
					while (this.jobs.length && (running < this.opt.concurrency || !this.opt.concurrency)) {
						running++;
						this.jobs.shift().run().then(onJobSucceeded, onJobErrored);
					}
					// If nothing is running at this point, this collection is done
					if (!running) resolve(this.chained ? this.chained.run() : this.result);
				}
			};
			let onJobSucceeded = (res) => {
				running--;
				// Is the job result an array?
				if (Array.isArray(res)) {
					this.result.push(...res);
					if (this.chained) this.chained.addJobs(res);
				}
				// Is the job result defined?
				else if (typeof res !== 'undefined') {
					this.result.push(res);
					if (this.chained) this.chained.addJob(res);
				}
				proceed();
			};
			let onJobErrored = (err) => {
				running--;
				if (this.opt.failOnError) {
					// Fatal errors are not emitted in situ
					// Global catcher should emit them instead
					reject(err);
				}
				else {
					// Since this wasn't fatal, only emitting a warning
					this.emitter.emit('warning', err);
					// ... and proceeding
					proceed();
				}
			};
			// Trigger the chain reaction
			proceed();
		});
		return this.promise;
	}

	chain (collection) {
		return this.chained = collection;
	}
}

/**
 * An interface class for mcopy jobs
 * @type {Job}
 */
class Job {
	constructor (collection, src, dest) {
		this.collection = collection;
		this.opt = collection.opt;
		this.emitter = collection.emitter;
		this.src = src;
		this.dest = dest;
	}
}

module.exports = {Job, JobsCollection};