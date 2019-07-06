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

async function assertFile (...args) {
	let fileSize = (typeof args[args.length - 1] === 'number') ? args.pop() : DEFAULT_FILE_SIZE;
	let s = await stat(join(...args));
	expect(s.size).toBe(fileSize);
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

describe('Handpicked manual tests', () => {
	it('Should copy one file', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		await mcopy(srcFile, dest).run();
		await assertFile(dest, 'test.dat');
	});
});

describe('Target directories creation', () => {
	it('Should create dir', async (src, dest) => {
		let srcFile = await createFile(src, 'test.dat');
		await mcopy(srcFile, join(dest, 'subfolder'), {createDir: true}).run();
		await assertFile(dest, 'subfolder', 'test.dat');
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