const Machinegun = require('machinegun');

/**
 * Base class for the copy jobs
 * @type {Job}
 */
class Job {
	constructor (collection, src, dest) {
		this.collection = collection;
		this.src = src;
		this.dest = dest;
	}
}


/**
 * Base class for the jobs collections
 * @type {JobsCollection}
 */
class JobsCollection {
	constructor (opt, emitter) {
		this.opt = opt;
		this.emitter = emitter;
	}

	/**
	 * A placeholder for the method that returns an instance of the job object for the collection
	 * @return {Job}
	 */
	newJob (src, dest) {
		throw "Child class must implement newJob()";
	}

	/**
	 * A placeholder for the method that pushes an instance of the job object into the collection
	 */
	pushJob () {
		throw "Child class must implement pushJob()";
	}

	/**
	 * A placeholder for the method that runs all the jobs in the collection
	 */
	async run () {
		throw "Child class must implement run()";
	}

	/**
	 * Runs the specified job
	 * @param {Job} job
	 */
	runJob (job) {
		return job.run();
	}

	addJob (...args) {
		try {
			this.pushJob(this.newJob(...args));
		} catch (e) {
			if (this.opt.failOnError) throw e;
		}
	}

	/**
	 * A placeholder for a method that returns an instance of the next collection object
	 * @return {JobsCollection}
	 */
	newNextCollection () {
		throw "Child class must implement newNextCollection()";
	}

	getNextCollection () {
		if (!this.nextCollection) this.nextCollection = this.newNextCollection();
		return this.nextCollection;
	}

	addJobToNextCollection (...args) {
		this.getNextCollection().addJob(...args);
	}

	next () {
		this.getNextCollection().run();
	}
}

/**
 * Base class for the jobs collections with synchronous runner
 * @type {JobsCollectionSync}
 */
class JobsCollectionSync extends JobsCollection {
	constructor (...args) {
		super(...args);
		this.jobs = [];
	}

	/**
	 * Pushes the job object to the collection's array
	 * @param {Job} job
	 */
	pushJob (job) {
		if (job) this.jobs.push(job);
	}

	/**
	 * Synchronously runs the jobs in the collection
	 */
	async run () {
		this.jobs.forEach((job) => {
			try {
				this.runJob(job);
			}
			catch (e) {
				if (this.opt.failOnError) throw e;
			}
		});
		// Run next collection
		return this.next();
	}
}

/**
 * Base class for the jobs collections with asynchronous runner
 * @type {JobsCollectionAsync}
 */
class JobsCollectionAsync extends JobsCollection {
	constructor (...args) {
		super(...args);
		this.machinegun = new Machinegun({
			barrels: this.opt.parallel,
			giveUpOnError: this.opt.failOnError,
			fireImmediately: false
		});
	}

	/**
	 * Loads the job runner to the collection's machinegun
	 * @param {Job} job
	 */
	pushJob (job) {
		if (job) this.machinegun.load(() => this.runJob(job));
	}

	/**
	 * Asynchronously runs the jobs in the collection via machinegun
	 */
	async run () {
		return this.machinegun
			.fire()
			.promise()
			.then(() => this.next());
	}
}

module.exports = {Job, JobsCollectionSync, JobsCollectionAsync};