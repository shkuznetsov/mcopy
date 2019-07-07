const util = require('util');
const fs = require('fs');
const path = require('path');
const mkdirp = util.promisify(require('mkdirp'));
const unlink = util.promisify(fs.unlink);
const access = util.promisify(fs.access);

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
			else throw new Error("Multiple sources can't copy to the same destination: " +
				`['${this.srcsByDest[destPath]}', '${srcPath}'] > '${destPath}'`);
		}
		else this.srcsByDest[destPath] = srcPath;
		// Is this a source duplicate?
		if (this.destsBySrc[srcPath]) this.destsBySrc[srcPath]++;
		else this.destsBySrc[srcPath] = 1;
		// A function for the job to detect when the source can be deleted
		let okToDeleteSource = () => !--this.destsBySrc[srcPath];
		// Create the job
		return new CopyJob(seed[0], seed[1], this, okToDeleteSource, this.opt);
	}
	run () {
		return super.run().catch();
	}
};

class CopyJob {
	constructor (src, dest, emitter, okToDeleteSource, opt) {
		this.src = src;
		this.dest = dest;
		this.emitter = emitter;
		this.okToDeleteSource = okToDeleteSource;
		this.opt = opt;
	}
	async run () {
		await this.prepareDestination();
		await this.copy();
		await this.deleteSource();
	}
	prepareDestination () {
		return new Promise((resolve, reject) => {
			let destDir = path.dirname(this.dest);
			// Does the destination directory exist?
			access(destDir)
				// Yes, it does
				.then(() => {
					// If we're allowed to overwrite destination — resolve
					if (this.opt.overwrite) resolve();
					// Otherwise, check whether destination file exists
					else access(this.dest)
						.then(() => reject(new Error(`Destination file exists: ${this.dest}`)))
						.catch(() => resolve());
				})
				// No, it does not
				.catch(() => {
					// If we're not allowed to create dest directories — reject
					if (!this.opt.createDir) reject(new Error(`Destination directory does not exist: ${destDir}`));
					// Otherwise, create the destination directory
					else mkdirp(destDir).then(resolve, reject);
				});
		});
	}
	copy () {
		return new Promise((resolve, reject) => {
			let done = false;
			// Check the status and wrap things up
			const wrapUp = () => {
				if (done) return false;
				done = true;
				clearInterval(progressInterval);
				return true;
			};
			// Create read stream and attach handlers
			let read = fs.createReadStream(this.src.path, {highWaterMark: this.opt.highWaterMark})
				.on('error', (err) => wrapUp() && reject(err));
			// Create write stream and attach handlers
			let write = fs.createWriteStream(this.dest)
				.on('error', (err) => wrapUp() && reject(err))
				.on('finish', () => wrapUp() && resolve());
			// Initialise progress updater
			let progressInterval = setInterval(() => {
				this.emitter.emit('progress', this.src, this.dest, write.bytesWritten);
			}, this.opt.progressUpdateInterval);
			// Attach an abortion handler
			this.emitter.on('error', () => {
				if (!wrapUp()) return;
				read.removeAllListeners();
				write.removeAllListeners();
				read.unpipe();
				write.end();
				// Remove the destination file
				unlink(this.dest).then(() => reject(new Error('Aborted')), reject);
			});
			// Pipe the streams together
			read.pipe(write);
		});
	}
	deleteSource () {
		if (this.opt.deleteSource && this.okToDeleteSource()) return unlink(this.src.path);
	}
}