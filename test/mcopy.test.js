const cartesian = require('cartesian');
const filenamify = require('filenamify');
const posixify = require('normalize-path');
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
	return posixify(path.join(...args));
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
		let testDir = filenamify(name);
		let src = join(FIXTURES_DIR, testDir, 'src');
		let dest = join(FIXTURES_DIR, testDir, 'dest');
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
		srcIsArray: [true, false],
		srcIsGlob: [true, false],
		destIsFunction: [true, false],
		optExists: [true, false]
	});
});