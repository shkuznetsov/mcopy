const path = require('path');

const {Job, JobsCollection} = require('./JobsAndCollections');
const CopyCollection = require('./CopyCollection');

module.exports = class ResolveDestinationsCollection extends JobsCollection {
	newJob (src, dest) {
		return new ResolveDestinationsJob(this, src, dest);
	}
};

class ResolveDestinationsJob extends Job {
	async run () {
		// If dest is a function, call it
		if (typeof this.dest === 'function') this.dest = await this.dest(this.src);
		// If dest is an array, create a job for each element
		if (Array.isArray(this.dest)) this.dest.forEach((dest) => this.addJobToChainedCollection(dest));
		// ... or just create a job for the value otherwise
		else this.addJobToChainedCollection(this.dest);
	}
	addJobToChainedCollection (dest) {
		if (dest) {
			dest = {path: path.resolve(dest, this.src.basename)};
			dest.basename = this.src.basename;
			dest.dirname = path.dirname(dest.path);
			this.collection.chained.addJob(this.src, dest);
		}
	}
}