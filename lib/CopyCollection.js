const util = require('util');
const fs = require('fs');
const mkdirp = util.promisify(require('mkdirp'));
const unlink = util.promisify(fs.unlink);

const {MCJob, MCJobsCollection} = require('./JobsAndCollections');

module.exports = class CopyCollection extends MCJobsCollection {
	constructor (opt, emitter) {
		super(opt, emitter);
		this.jobsBySrc = {};
		this.jobsByDest = {};
	}
	newJob (src, dest) {
		return new CopyJob(this, src, dest);
	}
	pushJob (job) {
		// Is this a destination duplicate?
		if (this.jobsByDest[job.dest.path]) {
			// Is this is a full duplicate?
			if (this.jobsByDest[job.dest.path].src.path === job.src.path) return;
			// No, it isn't - crash!
			else throw "Multiple sources can't copy to the same destination: " +
				`['${this.jobsByDest[job.dest.path].src.path}', '${job.src.path}'] > '${job.dest.path}'`;
		}
		else this.jobsByDest[job.dest.path] = job;
		// Is this a source duplicate?
		if (this.jobsBySrc[job.src.path]) this.jobsBySrc[job.src.path]++;
		else this.jobsBySrc[job.src.path] = 1;
		// Push the job
		super.pushJob(job);
	}

	okToDeleteSource (path) {
		return !--this.jobsBySrc[path];
	}

	done () {
		console.log('DONE :D');
	}
};

class CopyJob extends MCJob {

	async run () {
		await this.createDestinationDir();
		await this.checkDestinationDoesNotExist();
		await this.copy();
		await this.deleteSource();
		this.reportDone();
	}

	createDestinationDir () {
		if (this.collection.opt.createDir) return mkdirp(this.dest.dirname);
	}

	checkDestinationDoesNotExist () {
		if (!this.collection.opt.overwrite) return new Promise((resolve, reject) =>
			fs.access(this.dest.path, (err) => {
				// Error here means the file does not exist, which is good
				if (err) resolve();
				// And no error means the file exists, so we fail
				else reject(`Destination file exists: ${this.dest.path}`);
			})
		);
	}

	copy () {
		return new Promise((resolve, reject) => {
			let done = false;
			// Create streams
			let read = fs.createReadStream(this.src.path, {
				highWaterMark: this.opt.highWaterMark
			});
			let write = fs.createWriteStream(this.dest.path);
			// Initialise progress updater
			let progressInterval = setInterval(() => {
				this.emitter.emit('progress', this.src, this.dest, write.bytesWritten);
			}, this.opt.progressUpdateInterval);
			// Check the status and wrap things up
			const wrapUp = () => {
				if (done) return false;
				done = true;
				clearInterval(progressInterval);
				return true;
			};
			// Attach stream events
			read.on('error', (err) => wrapUp() && reject(err));
			write.on('error', (err) => wrapUp() && reject(err));
			write.on('finish', () => wrapUp() && resolve());
			// Attach an abortion handler
			this.collection.machinegun.on('giveUp', () => {
				if (!wrapUp()) return;
				read.removeAllListeners();
				write.removeAllListeners();
				read.unpipe();
				write.end();
				// Remove the destination file
				unlink(this.dest.path).then(() => reject('Aborted'), reject);
			});
			// Pipe the streams together
			read.pipe(write);
		});
	}

	deleteSource () {
		if (this.opt.deleteSource &&
			this.collection.okToDeleteSource(this.src.path)) return unlink(this.src.path);
	}

	reportDone () {
		// TODO
	}
}