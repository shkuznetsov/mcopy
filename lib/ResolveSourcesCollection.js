const glob = require('fast-glob');
const path = require('path');

const {MCJob, MCJobsCollection} = require('./JobsAndCollections');
const ResolveDestinationsCollection = require('./ResolveDestinationsCollection');

module.exports = class ResolveSourcesCollection extends MCJobsCollection {
	constructor (jobs, opt, emitter) {
		super(opt, emitter);
		jobs.forEach((job) => this.addJob(job));
	}
	newNextCollection () {
		return new ResolveDestinationsCollection(this.opt, this.emitter);
	}
	newJob (job) {
		return new ResolveSourcesJob(this, job);
	}
};

class ResolveSourcesJob extends MCJob {
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
				this.collection.next.addJob(src, this.dest);
			})
		);
	}
}