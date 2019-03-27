const Machinegun = require('machinegun');

/**
 * Base class for the jobs collections
 * @type {JobsCollection}
 */
class JobsCollection {

	constructor (failOnError, parallel) {
		this.failOnError = failOnError;
		this.parallel = parallel;
		// Initialise machinegun
		this.machinegun = new Machinegun({
			barrels: this.parallel,
			giveUpOnError: this.failOnError,
			fireImmediately: false
		});
	}

	//
	// Jobs management methods
	//

	newJob (...args) {
		return new Job(...args);
	}

	pushJob (job) {
		if (job) this.machinegun.load(() => this.runJob(job));
	}

	addJob (...args) {
		try {
			this.pushJob(this.newJob(...args));
		} catch (e) {
			if (this.failOnError) throw e;
		}
	}

	runJob (job) {
		return job.run(this);
	}

	//
	// Collection execution and chaining methods
	//

	run () {
		return this.machinegun.fire().promise().then(() => this.done());
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
 * An interface class for mcopy jobs collections
 * @type {MCJobsCollection}
 */
class MCJobsCollection extends JobsCollection {
	constructor (opt, emitter) {
		super(opt.failOnError, opt.parallel);
		this.opt = opt;
		this.emitter = emitter;
	}
}

/**
 * An interface class for mcopy jobs
 * @type {MCJob}
 */
class MCJob {
	constructor (src, dest) {
		this.src = src;
		this.dest = dest;
	}
}

module.exports = {MCJob, MCJobsCollection};