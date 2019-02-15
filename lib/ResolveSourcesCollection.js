import glob from 'fast-glob';
import path from 'path';

import {Job, JobsCollectionAsync} from './JobsAndCollections';
import ResolveDestinationsCollection from './ResolveDestinationsCollection';

export default class ResolveSourcesCollection extends JobsCollectionAsync {
	newNextCollection () {
		return new ResolveDestinationsCollection(this.opt, this.emitter);
	}
	newJob (src, dest) {
		return new ResolveSourcesJob(this, src, dest);
	}
}

class ResolveSourcesJob extends Job {
	run () {
		return glob(this.src, this.opt.globOpt)
			.then((srcs) =>
				srcs.forEach((src) => {
					src.path = path.resolve(src.path);
					src.basename = path.basename(src.path);
					src.dirname = path.dirname(src.path);
					this.collection.addJobToNextCollection(src, this.dest)
				})
			);
	}
}