const glob = require('fast-glob');
const path = require('path');

const {Job, JobsCollectionAsync} = require('./JobsAndCollections');
const ResolveDestinationsCollection = require('./ResolveDestinationsCollection');

module.exports = class ResolveSourcesCollection extends JobsCollectionAsync {
	newNextCollection () {
		return new ResolveDestinationsCollection(this.opt, this.emitter);
	}
	newJob (src, dest) {
		return new ResolveSourcesJob(this, src, dest);
	}
};

class ResolveSourcesJob extends Job {
	run () {
		return glob(this.src, this.collection.opt.globOpt).then((srcs) =>
			srcs.forEach((src) => {
				src.path = path.resolve(src.path);
				src.basename = path.basename(src.path);
				src.dirname = path.dirname(src.path);
				this.collection.addJobToNextCollection(src, this.dest);
			})
		);
	}
}