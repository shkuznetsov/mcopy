**This documentation is very much work in progress still, please be patient and forgive me my laziness!**

# mcopy
Copy multiple files with streams, progress events for larger files, parallel execution and a panda.

## Usage
### Installing it
It's as standard as can be. To install the plugin add it to your project's ``package.json`` dependencies or install manually running:
```
npm install mcopy
```
Then pull it into your code:
```
var mcopy = require('mcopy');
```
### Running it
Feed it an array of objects, each containing ``src`` and ``dest`` attributes with file paths (directories will be supported, eventually) and some sort of callback function:
```
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...], (err) => {
  if (err) console.log('Boo!');
  else console.log('Paw!');
});

mcopy('/path/to/source/dir/**', '/path/to/dest/dir', (err) => {});

mcopy(['/path/to/source/file', ...], '/path/to/dest/dir', (err) => {});

mcopy([{src: '/path/to/source/file', dest: '/path/to/dest/file'}, ...], (err) => {});


```
If you like events more than callbacks, it'll emit some for you:
```
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...])
  .on('complete', (err) => {
    if (err) console.log('Boo!');
    else console.log('Paw!');
  });
```
Or if you like jQuery-flavoured events:
```
mcopy([{src: '/path/to/source.file', dest: '/path/to/destination.file'}, ...])
  .on('error', (err) => console.log('Boo!'))
  .on('success', () => console.log('Paw!'));
```
Please refer to the events section for the full list of emitted events and their arguments.

### Reporting progress
When copying large files (this plugin was created as a part of media collection management system) it is beneficial to be able to report interim progress to the user. Here's how that is done:
```
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
```
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
Default: ``1``. Parallel copying threads. Haven't done any testing here yet (will do at some point) but I'm fairly certain that having more than 1 parallel threads will actually make copying slower since sequential read/write is faster than random on any physical disc, even SSD. So use at your own risk.

### Events

#### ``.on('progress', (progress) => {...})``
Emitted every time a file finished copying or ``highWaterMark`` bytes copied over. ``progress`` argument is an object with the following properties:
*
```
{
  filesCopied: <int>,
  filesTotal: <int>,
  bytesCopied: <int>,
  bytesTotal: <int>,
  file: {<file caused the event>},
  fileBytesCopied: <int>,
  fileBytesTotal: <int>,
}
```
## License
[MIT License](http://en.wikipedia.org/wiki/MIT_License)

## Here goes the panda
![Here goes the panda](https://upload.wikimedia.org/wikipedia/commons/c/cd/Panda_Cub_from_Wolong%2C_Sichuan%2C_China.JPG)
