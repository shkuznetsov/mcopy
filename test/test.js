var	chai = require('chai'),
    expect = chai.expect,
	fs = require('fs'),
	rimraf = require('rimraf'),
	mkdirp = require('mkdirp'),
    mcopy = require('../mcopy.js');

chai.use(require('chai-fs'));

describe('mcopy', function()
{
	var srcDir = __dirname + '/fixture/src/',
	    destDir = __dirname + '/fixture/dest/',
	    contentLength = 100,
	    filesCount = 2,
	    files = [],
	    badFiles;

	before(function() {
		// Create source and destination directories
		mkdirp.sync(srcDir + 'sub/');
		mkdirp.sync(destDir);

		// Create test files
		['file1.foo', 'file2.bar', 'sub/file3.foo', 'sub/file4.bar'].forEach((path, i) => {
			var file = {
				index: i,
				src: srcDir + path,
				dest: destDir + path,
				content: new Array(contentLength + 1).join(i)
			};
			files.push(file);
			fs.writeFileSync(file.src, file.content);
		});

		// Emulate bad files set (1st source file missing)
		badFiles = files.slice();
		badFiles.unshift({
			src: srcDir + 'non.existent',
			dest: destDir + 'non.existent',
			content: new Array(contentLength + 1).join('n')
		});
	});

	after(function() {
		rimraf.sync(srcDir);
		rimraf.sync(destDir);
	});

	afterEach(function(done) {
		rimraf(destDir + '*', done);
	});

	it("should copy files and call explicit callback with falsy argument", function(done) {
		mcopy(files, function(err) {
			for (var i = 0; i < filesCount; i++) {
				expect(files[i].dest).to.be.a.file();
				expect(files[i].dest).to.have.content(files[i].content);
			}
			done(err);
		});
	});

	it("should copy files and emit 'complete' event", function(done) {
		mcopy(files).on('complete', function(err) {
			for (var i = 0; i < filesCount; i++) {
				expect(files[i].dest).to.be.a.file();
				expect(files[i].dest).to.have.content(files[i].content);
			}
			done(err);
		});
	});

	it("should copy files and emit 'success' event", function(done) {
		mcopy(files).on('success', function() {
			for (var i = 0; i < filesCount; i++) {
				expect(files[i].dest).to.be.a.file();
				expect(files[i].dest).to.have.content(files[i].content);
			}
			done();
		});
	});

	it("should fail to copy files and call explicit callback with 'Error' argument", function(done) {
		mcopy(badFiles, function(err) {
			expect(err).to.be.an.instanceof(Error);
			done();
		});
	});

	it("should fail to copy files and and emit 'error' event with 'Error' argument", function(done) {
		mcopy(badFiles).on('error', function(err) {
			console.log('-', err);
			expect(err).to.be.an.instanceof(Error);
			done();
		});
	});

	it("should fail to copy files and and emit 'complete' event", function(done) {
		mcopy(badFiles).on('complete', done);
	});

	it("should respect 'highWaterMark' option and emit 'progress' events", function(done) {
		var highWaterMark = 10,
		    progressHistory = [],
		    errored = false;
		mcopy(files, {highWaterMark: highWaterMark})
			.on('progress', function(progress, file) {
			/*	if ((!progressHistory[file.arg.index] && progress.bytesCopied == highWaterMark) ||
					progress.bytesCopied == progressHistory[file.arg.index] + highWaterMark ||
					progress.bytesCopied == progress.bytesTotal) {
					progressHistory[file.arg.index] = progress.bytesCopied;
				} else {
					errored = true;
				}*/
			})
			.on('complete', function(err) {
				done(err || (errored ? new Error("Progress sequence violation") : null));
			});
	});

});
/*
should error if src is not a string

*/