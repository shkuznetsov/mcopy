const cartesian = require('cartesian-mutable');
const normalisePath = require('normalize-path');
const util = require('util');
const path = require('path');
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);
const mkdirp = util.promisify(require('mkdirp'));
const rimraf = util.promisify(require('rimraf'));

const mcopy = require('../mcopy');

const DEFAULT_FILE_SIZE = 100;
const FIXTURES_DIR = join(__dirname, 'fx');

// Create and delete the fixtures folder
beforeAll(() => mkdirp(FIXTURES_DIR));
afterAll(() => rimraf(FIXTURES_DIR));

function join(...args) {
	return normalisePath(path.join(...args));
}

async function createFile (...args) {
	let fileSize = (typeof args[args.length - 1] === 'number') ? args.pop() : DEFAULT_FILE_SIZE;
	let filePath = join(...args);
	await mkdirp(path.dirname(filePath));
	await writeFile(filePath, 'a'.repeat(fileSize));
	return filePath;
}

async function assertFileExists (...args) {
	let fileSize = (typeof args[args.length - 1] === 'number') ? args.pop() : DEFAULT_FILE_SIZE;
	let s = await stat(join(...args));
	expect(s.size).toBe(fileSize);
}

async function assertFileDoesntExist (...args) {
	await expect(stat(join(...args))).rejects.toThrow();
}

async function it (name, fn) {
	test(name, async () => {
		let src = join(FIXTURES_DIR, name, 'src');
		let dest = join(FIXTURES_DIR, name, 'dest');
		await mkdirp(src);
		await mkdirp(dest);
		return fn(src, dest);
	});
}

describe('Test helpers', () => {
	it('Should create a file', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		await assertFileExists(src, 'test.dat');
		await assertFileDoesntExist(dest, 'test.dat');
	});
});

describe('Handpicked manual tests', () => {
	it('Should copy one file', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		await mcopy(srcFile, dest).run();
		await assertFileExists(dest, 'test.dat');
	});
	it('Should copy one file to multiple destinations and delete the source', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		let opt = {
			deleteSource: true,
			createDir: true
		};
		await mcopy(srcFile, [join(dest, 'd1'), join(dest, 'd2')], opt).run();
		await assertFileExists(dest, 'd1', 'test.dat');
		await assertFileExists(dest, 'd2', 'test.dat');
		await assertFileDoesntExist(src, 'test.dat');
	});
});

describe('Target directories creation', () => {
	it('Should create dir', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		await mcopy(srcFile, join(dest, 'subfolder'), {createDir: true}).run();
		await assertFileExists(dest, 'subfolder', 'test.dat');
	});
	it('Should fail if no dir exists', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		let pr = mcopy(srcFile, join(dest, 'subfolder'), {createDir: false}).run();
		await expect(pr).rejects.toThrow();
	});
});

describe('Cartesian-based automated bashing', () => {
	const combinations = cartesian({
		multipleJobs: [true, false],
		jobIsArray: [true, false],
		srcIsGlob: [true, false],
		srcIsArray: [true, false],
		srcGlobNested: (v) => (v.srcIsGlob && v.srcIsArray) ? [true, false] : undefined,
		srcGlobNegated: (v) => (v.srcIsGlob && v.srcIsArray) ? [true, false] : undefined,
		destIsFunction: [true, false],
		destFuncAsync: (v) => v.destIsFunction ? [true, false] : undefined,
		destIsArray: [true, false],
		optCreateDir: [true, false]
	});
	combinations.forEach((v) => {
		let testName = JSON.stringify(v)
			.replace(/[{}]/g, '')
			.replace(/"/g, '')
			.replace(/:/g, '=');
		it(testName, async (src, dest) => {
			let assertions = [];
			const prepareCopyJob = async (jobDir) => {
				let files = [];
				const addSrcFile = async (...args) => {
					let exists = !args[0] ? args.shift() : true;
					await createFile(src, jobDir, ...args);
					files.push({name: args.pop(), exists});
				};
				const addDestDir = async (...args) => {
					let destDir = join(dest, jobDir, ...args);
					if (!v.optCreateDir) await mkdirp(destDir);
					files.forEach((file) => assertions.push({path: join(destDir, file.name), exists: file.exists}));
					return destDir;
				};
				// Prepare files
				await addSrcFile('one.dat');
				if (v.srcIsGlob) await addSrcFile('two.dat');
				if (v.srcIsArray) await addSrcFile('three.doo');
				if (v.srcGlobNested) await addSrcFile('sub', 'nested.dat');
				if (v.srcGlobNegated) await addSrcFile(false, 'notthisone.dat');
				// Prepare source parameter
				let source = join(src, jobDir, v.srcIsGlob ? '**/*.dat' : 'one.dat');
				if (v.srcIsArray) source = [source, join(src, jobDir, v.srcIsGlob ? '*.doo' : 'three.doo')];
				if (v.srcGlobNegated) source.push('!' + join(src, jobDir, 'notthisone.*'));
				// Prepare destination parameter
				let destDirs, destination;
				if (v.destIsArray) destDirs = [await addDestDir('dest dir one'), await addDestDir('dest dir two')];
				else destDirs = await addDestDir('dest dir only');
				if (!v.destIsFunction) destination = destDirs;
				else if (v.destFuncAsync) destination = () => Promise.resolve(destDirs);
				else destination = () => destDirs;
				// Return
				return v.jobIsArray ? [source, destination] : {src: source, dest: destination};
			};
			// Prepare opt
			let opt = {
				createDir: v.optCreateDir
			};
			// Start jobs
			let job = await prepareCopyJob('source dir');
			if (v.multipleJobs) await mcopy([job, await prepareCopyJob('another source dir')], opt).run();
			else if (v.jobIsArray) await mcopy(...job, opt).run();
			else await mcopy(job, opt).run();
			// Assert jobs
			assertions.forEach(async (a) => {
				if (a.exists) await assertFileExists(a.path);
				else await assertFileDoesntExist(a.path);
			});
		});
	});
});