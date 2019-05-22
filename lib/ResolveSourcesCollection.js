const glob = require('fast-glob');
const path = require('path');

const {Job, JobsCollection} = require('./JobsAndCollections');
const ResolveDestinationsCollection = require('./ResolveDestinationsCollection');

module.exports = class ResolveSourcesCollection extends JobsCollection {
	load (jobs) {
		jobs.forEach((job) => this.addJob(job));
	}
	newJob (job) {
		return new ResolveSourcesJob(this, job);
	}
};

class ResolveSourcesJob extends Job {
	constructor (collection, job) {
		// [<src>, <dest>] ?
		if (Array.isArray(job)) super(collection, job[0], job[1]);
		// {src: <src>, dest: <dest>} ?
		else if (typeof job === 'object') super(collection, job.src, job.dest);
		// Umm, fishy
		else throw "Malformed input job: " + JSON.stringify(job);
	}
	run () {
		return glob(this.src, this.opt.globOpt).then((srcs) =>
			srcs.forEach((src) => {
				src.path = path.resolve(src.path);
				src.basename = path.basename(src.path);
				src.dirname = path.dirname(src.path);
				this.collection.chained.addJob(src, this.dest);
			})
		);
	}
}