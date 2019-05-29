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
		this.on('', (event) => {
			if (event === 'error')
		});
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
			else this.emit('warning', err);
		}
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
		if (!this.promise) {
			this.promise = new Promise((resolve, reject) => {
				let running = 0;
				let proceed = () => {
					// Only proceed if the promise hasn't been settled yet
					if (!settled) {
						// Start required number of jobs up to the concurrency limit
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
						this.emit('warning', err);
						// ... and proceeding
						proceed();
					}
				};
				// Trigger the chain reaction
				proceed();
			});
		}
		return this.promise;
	}

	chain (collection) {
		this.chained = collection;
		return super.chain(collection);
	}
}