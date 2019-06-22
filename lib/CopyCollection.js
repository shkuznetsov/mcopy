const util = require('util');
const fs = require('fs');
const mkdirp = util.promisify(require('mkdirp'));
const unlink = util.promisify(fs.unlink);

const JobsCollection = require('./JobsCollectionChainable');

module.exports = class CopyCollection extends JobsCollection {
	constructor (opt) {
		super(opt);
		this.destsBySrc = {};
		this.srcsByDest = {};
	}
	newJob (seed) {
		let srcPath = path.resolve(seed[0].path);
		let destPath = path.resolve(seed[1]);
		// Is this a destination duplicate?
		if (this.srcsByDest[destPath]) {
			// Is this is a full duplicate?
			if (this.srcsByDest[destPath] === srcPath) return;
			// No, it isn't - crash!
			else throw "Multiple sources can't copy to the same destination: " +
				`['${this.srcsByDest[destPath]}', '${srcPath}'] > '${destPath}'`;
		}
		else this.srcsByDest[destPath] = srcPath;
		// Is this a source duplicate?
		if (this.destsBySrc[srcPath]) this.destsBySrc[srcPath]++;
		else this.destsBySrc[srcPath] = 1;
		// Create the job
		return new CopyJob(seed[0], seed[1], this, this.opt);
	}
	run () {
		return super.run().catch();
	}
	okToDeleteSource (srcPath) {
		return !--this.destsBySrc[path.resolve(srcPath)];
	}
};

class CopyJob {
	constructor (src, dest, emitter, opt) {
		this.src = src;
		this.dest = dest;
		this.emitter = emitter;
		this.opt = opt;
	}
	async run () {
		await this.createDestinationDir();
		await this.checkDestinationDoesNotExist();
		await this.copy();
		await this.deleteSource();
		this.reportDone();
	}
	createDestinationDir () {
		if (this.opt.createDir) return mkdirp(this.dest.dirname);
	}
	checkDestinationDoesNotExist () {
		if (!this.opt.overwrite) return new Promise((resolve, reject) =>
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
			let write = fs.createWriteStream(this.dest);
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
			this.emitter.on('error', () => {
				if (!wrapUp()) return;
				read.removeAllListeners();
				write.removeAllListeners();
				read.unpipe();
				write.end();
				// Remove the destination file
				unlink(this.dest).then(() => reject('Aborted'), reject);
			});
			// Pipe the streams together
			read.pipe(write);
		});
	}
	deleteSource () {
		if (this.opt.deleteSource &&
			this.collection.okToDeleteSource(this.src.path)) return unlink(this.src.path);
	}
}