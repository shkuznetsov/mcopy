**This documentation is very much work in progress still, please be patient and forgive me my laziness!**

# mcopy
Copies multiple files with globs, streams, progress events, parallel execution and a panda.

## Basic usage
Add it to your project's dependencies:
```
npm install mcopy --save
```
Pull it into your code:
```javascript
const mcopy = require('mcopy');
```
Run it:
```javascript
mcopy('/path/to/source/dir/**', '/path/to/dest/dir', (err) => {
    if (err) console.log('Boo!');
    else console.log('Paw!');
});
```

## Not-so-basic usage

Single copy job syntax:
```javascript
// Shorthand
mcopy(<source>, <destination>, {...<options>}, <callback>);
// Verbose
mcopy({"src": <source>, "dest": <destination>}, {...<options>}, <callback>);
```

Multiple copy jobs syntax:
```javascript
// Shorthand
mcopy([[<source>, <destination>], ...], {...<options>}, <callback>);
// Verbose
mcopy([{"src": <source>, "dest": <destination>}, ...], {...<options>}, <callback>);
```

<source> may take the following values:
- A local file path
- An array of local file paths
- A glob
- An array of globs

<destination> may take the following values:
- A local file path
- A local directory path
- A function


Feed it an array of objects, each containing ``src`` and ``dest`` attributes with file paths (directories will be supported, eventually) and some sort of callback function:
```javascript
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...], (err) => {
  if (err) console.log('Boo!');
  else console.log('Paw!');
});

mcopy('/path/to/source/dir/**', '/path/to/dest/dir', (err) => {});

mcopy(['/path/to/source/file', ...], '/path/to/dest/dir', (err) => {});

mcopy([{src: '/path/to/source/file', dest: '/path/to/dest/file'}, ...], (err) => {});

mcopy([{src: '/path/to/source/file', dest: '/path/to/dest/dir/'}, ...], (err) => {});

// Below only makes sense if /path/to/dest/dir exists and is a directory
// If it doesn't exist, mcopy will assume it's a file path
// If it does exist and is a file, mcopy will either fail or overwrite the file
// depending on destOverwrite option value
mcopy([{src: '/path/to/source/file', dest: '/path/to/dest/dir'}, ...], (err) => {});


```
If you like events more than callbacks, it'll emit some for you:
```javascript
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...])
  .on('complete', (err) => {
    if (err) console.log('Boo!');
    else console.log('Paw!');
  });
```
Or if you like jQuery-flavoured events:
```javascript
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...])
  .on('error', (err) => console.log('Boo!'))
  .on('success', () => console.log('Paw!'));
```
Please refer to the events section for the full list of emitted events and their arguments.

### Reporting progress
When copying large files (this plugin was created as a part of media collection management system) it is beneficial to be able to report interim progress to the user. Here's how that is done:
```javascript
mcopy([{src: '/path/to/enormous.source.file', dest: '/path/to/enormous.destination.file'}, ...])
  .on('progress', (progress) => {
    console.log('Copied ' + progress.bytesCopied + ' of ' + progress.bytesTotal + ' bytes');
    console.log('Completed ' + progress.filesCopied + ' of ' + progress.filesTotal + ' files');
  })
  .on('error', (err) => console.log('Boo!'))
  .on('success', () => console.log('Paw!'));
```
Please refer to the ``progress`` event spec for further information.

### Options
This is where it gets even fancier. You can use one of two syntaxes depending on what your code looks like:
```javascript
// Files and options as separate arguments
mcopy([<files>], {<options>});
// ... or files as a part of options object
mcopy({
  files: [<files>],
  <options>
});
```
Obviously, you should still drop in a callback function or hook up to events in order for the whole thing to make sense.

#### autoStart (NOT IMPLEMENTED YET!)
Default: ``true``. Determines whether the copying will start automatically. When set to ``false`` will start paused. Copying may be started by calling ``mcopy.resume()``.

#### failOnError
Default: ``true``. If set to ``false`` you may get one or more ``error`` callback, but the copying will carry on.

#### highWaterMark
Default: ``4194304``, that is 4 megs. Read stream buffer size, in bytes. Affects how many ``progress`` events the thing emits.

#### parallel
Default: ``1``. Parallel copying threads. Haven't done any performance testing here yet but my gut feeling is that having more than 1 parallel thread on any locally attached storage device will actually make copying slower since random read/writes slow down any physical disc, even an SSD. So use at your own risk.

### Events

#### ``.on('complete', (err) => {...})``
Emitted when execution stops. If there was an error ``err`` argument will be set to its value. In case ``failOnError`` set to ``false`` this event only emitted when all the files

#### ``.on('error', (err, file) => {...})``
Emitted when there's an error. In case ``failOnError`` set to ``true`` this may only be emitted once per run, then execution stops and all opened streams get closed.

#### ``.on('progress', (progress) => {...})``
Emitted every time a file finished copying or a next chunk of ``highWaterMark`` bytes read from the source. ``progress`` argument is an object with the following properties:
* ``filesCopied`` number of files copied over
* ``filesTotal`` total number of files to copy
* ``bytesCopied`` number of bytes copied over, across all the files
* ``bytesTotal`` total number of bytes to copy, across all the files
* ``file`` object describing a file being copied (one was fed in as an input, containing ``src`` and ``dest`` attributes)
* ``fileBytesCopied`` number of bytes copied over, in the particular file
* ``fileBytesTotal`` size in bytes of the particular file

## License
[MIT License](http://en.wikipedia.org/wiki/MIT_License)

## Here goes the panda
![Here goes the panda](https://upload.wikimedia.org/wikipedia/commons/c/cd/Panda_Cub_from_Wolong%2C_Sichuan%2C_China.JPG)
