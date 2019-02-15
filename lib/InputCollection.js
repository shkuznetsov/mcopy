import {JobsCollectionSync} from 'JobsAndCollections';
import ResolveSourcesCollection from 'ResolveSourcesCollection';

exports = class InputCollection extends JobsCollectionSync {
	constructor (jobs, opt, emitter) {
		super(opt, emitter);
		this.jobs = jobs;
	}
	newNextCollection () {
		return new ResolveSourcesCollection(this.opt, this.emitter);
	}

	/**
	 * Processes input array of jobs
	 * @param {Array|Object} job
	 */
	runJob (job) {
		// [<src>, <dest>] ?
		if (Array.isArray(job)) this.addJobToNextCollection(job[0], job[1]);
		// {src: <src>, dest: <dest>} ?
		else if (typeof job === 'object') this.addJobToNextCollection(job.src, job.dest);
		// Umm, fishy
		else throw "Invalid input job: " + JSON.stringify(job);
	}
};