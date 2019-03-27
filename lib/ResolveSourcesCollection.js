const glob = require('fast-glob');
const path = require('path');

const {MCJob, MCJobsCollection} = require('./JobsAndCollections');
const ResolveDestinationsCollection = require('./ResolveDestinationsCollection');

module.exports = class ResolveSourcesCollection extends MCJobsCollection {
	newNextCollection () {
		return new ResolveDestinationsCollection(this.opt, this.emitter);
	}
	newJob (job) {
		return new ResolveSourcesJob(job);
	}
};

class ResolveSourcesJob extends MCJob {
	constructor (job) {
		// [<src>, <dest>] ?
		if (Array.isArray(job)) super(job[0], job[1]);
		// {src: <src>, dest: <dest>} ?
		else if (typeof job === 'object') super(job.src, job.dest);
		// Umm, fishy
		else throw "Malformed input job: " + JSON.stringify(job);
	}
	run (collection) {
		return glob(this.src, collection.opt.globOpt).then((srcs) =>
			srcs.forEach((src) => {
				src.path = path.resolve(src.path);
				src.basename = path.basename(src.path);
				src.dirname = path.dirname(src.path);
				collection.next.addJob(src, this.dest);
			})
		);
	}
}