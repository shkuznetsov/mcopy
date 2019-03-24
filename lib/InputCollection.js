const {JobsCollectionSync} = require('./JobsAndCollections');
const ResolveSourcesCollection = require('./ResolveSourcesCollection');

module.exports = class InputCollection extends JobsCollectionSync {
	/**
	 * Constructor
	 * @param {Array} jobs - Array of the copy jobs, as received from the arguments
	 * @param {Object} opt
	 * @param {ProgressEmitter} emitter
	 */
	constructor (jobs, opt, emitter) {
		super(opt, emitter);
		this.jobs = jobs;
	}
	newNextCollection () {
		return new ResolveSourcesCollection(this.opt, this.emitter);
	}

	/**
	 * Processes a single job from the arguments array
	 * @param {Array|Object} job
	 */
	runJob (job) {
		// [<src>, <dest>] ?
		if (Array.isArray(job)) this.addJobToNextCollection(job[0], job[1]);
		// {src: <src>, dest: <dest>} ?
		else if (typeof job === 'object') this.addJobToNextCollection(job.src, job.dest);
		// Umm, fishy
		else throw "Malformed input job: " + JSON.stringify(job);
	}
};