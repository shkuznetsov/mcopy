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
		this.running = 0;
	}

	//
	// Jobs management methods
	//

	newJob (...args) {
		return new Job(this, ...args);
	}

	pushJob (job) {
		if (job) this.jobs.push(job);
	}

	addJob (...args) {
		try {
			this.pushJob(this.newJob(...args));
		} catch (e) {
			if (this.opt.failOnError) throw e;
		}
	}

	//
	// Collection execution and chaining methods
	//

	run () {
		if (!this.promise) this.promise = new Promise((resolve, reject) => {
			let nextJob = this.jobs.unshift();
			if (nextJob) {
				this.running++;
				
			}
		});
		return this.promise;
		// return this.machinegun.fire().promise().then(() => this.done());
	}

	done () {
		return this.next.run();
	}

	//
	// Next [collection] management methods
	//

	/**
	 * A placeholder for a method that returns an instance of the next collection object
	 * @return {JobsCollection}
	 */
	newNextCollection () {
		return new JobsCollection(this.failOnError, this.parallel);
	}

	get next () {
		if (!this.nextCollection) this.nextCollection = this.newNext();
		return this.nextCollection;
	}
}

/**
 * An interface class for jobs
 * @type {MCJob}
 */
class Job {
	constructor (collection) {
		this.collection = collection;
	}
}


/**
 * An interface class for mcopy jobs
 * @type {MCJob}
 */
class MCJob extends Job {
	constructor (collection, src, dest) {
		super(collection);
		this.opt = collection.opt;
		this.emitter = collection.emitter;
		this.src = src;
		this.dest = dest;
	}
}

module.exports = {MCJob, MCJobsCollection};