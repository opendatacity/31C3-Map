var config = require('../config/config.js');
var log = require('./log.js');
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var progress = require('request-progress');
var gm = require('gm');

function filesExist(list, callback) {
	log.debug('\nmyutils.filesExist');

	var allExists = list.every(function (filename) {
		var result = fs.existsSync(filename);
		log.debug('Does "'+filename+'" exist? Answer: ' + (result ? 'Yes!' : 'Nope! :('));
		return result
	})
	callback(allExists);
}

function download(urls, filenames, callback) {
	log.debug('\nmyutils.download');

	if (urls.length != filenames.length) throw new Error('Url and Filenames should have the same length');

	var tasks = [];
	urls.forEach(function (url, index) {
		var filename = path.join(config.imageFolder, filenames[index]);
		ensureFolder(path.dirname(filename));
		tasks.push(function (cb) {
			log.info('   Downloading "'+url+'" to "'+filename+'"')
			try {
				progress(request(url), { throttle: 5000, delay: 3000 })
					.on('progress', function (state) {
						log.info('   '+state.percent+'%');
					})
					.on('error', function (error) {
						log.error(error);
					})
					.on('end', function () {
						log.info('   Download complete');
						cb()
					})
					.pipe(fs.createWriteStream(filename))
			} catch (error) {
				log.error(error);
				throw error;
			}
		})
	})

	async.series(tasks, callback);
}

function copy(filesFrom, filesTo, callback) {
	log.debug('\nmyutils.download');

	if (filesFrom.length != filesTo.length) throw new Error('Url and Filenames should have the same length');

	var tasks = [];
	filesFrom.forEach(function (fileFrom, index) {
		var fileTo = filesTo[index];
		ensureFolder(path.dirname(fileTo));
		tasks.push(function (cb) {
			log.info('   Copying "'+fileFrom+'" to "'+fileTo+'"');

			try {
				var stream = fs.createReadStream(fileFrom);
				stream.on('error', function (error) {
					throw new Error(error);
				});
				stream.on('end', function () {
					cb()
				});
				stream.pipe(fs.createWriteStream(fileTo));
			} catch (error) {
				log.error(error);
				throw error;
			}
		})
	})

	async.series(tasks, callback);
}

function expandPattern(list) {
	log.debug('\nmyutils.expandPattern');

	var result = [];
	log.debug('Expand pattern "'+list+'":');
	list.forEach(check1);
	log.debug(result);
	return result;

	function check1(item) {
		var parts = split(item, '[]');
		if (!parts) return check2(item);

		parts[1].split(',').forEach(function (part) {
			check1(parts[0]+part+parts[2]);
		})
	}

	function check2(item) {
		var parts = split(item, '()');
		if (!parts) return result.push(item);

		var pattern = parts[1].split('-');
		pattern = pattern.map(stringToInt);
		for (var i = pattern[0]; i <= pattern[1]; i++) {
			check2(parts[0]+i+parts[2]);
		}
	}

	function split(text, syntax) {
		var i = text.indexOf(syntax[0]);
		if (i < 0) return false;

		var j = text.indexOf(syntax[1]);
		if (j < i) throw new Error('Broken pattern');

		return [
			text.substr(0,i),
			text.substr(i+1,j-i-1),
			text.substr(j+1)
		]
	}
}

function gmMultiOverlay(opts, callback) {
	log.debug('\nmyutils.gmMultiOverlay');
	log.info('   Merging floor plans');

	var filename = path.join(config.imageFolder, opts.filename);
	ensureFolder(path.dirname(filename));

	var image = gm();
	image.in('-size', opts.width+'x'+opts.height);
	image.in('xc:'+opts.background);
	
	opts.layers.forEach(function (layer) {
		image.in('-compose', 'over');
		image.in('-page', (layer.x < 0 ? '' : '+')+layer.x+(layer.y < 0 ? '' : '+')+layer.y);
		image.in(path.join(config.imageFolder, layer.filename));
	})

	image.in('-flatten');
	image.write(filename, function (err) {
		if (err) log.error(err);
		callback()
	});
}

function gmTiles(opts, callback) {
	log.debug('\nmyutils.gmTiles');
	log.info('   Rendering tiles');

	var maxDepth = Math.round(Math.log(opts.imageSize/opts.tileSize)/Math.log(2));
	var depths = [];
	for (var i = 0; i <= maxDepth; i++) depths[i] = i;

	var filename = path.join(config.imageFolder, opts.filename);
	var tileFolder = path.join(config.tileFolder, opts.tileFolder);

	var image = gm(opts.imageSize, opts.imageSize, opts.background);
	image.in('-compose', 'over');
	image.in('-page', '+'+opts.offsetX+'+'+opts.offsetY);
	image.in(filename);
	image.in('-flatten');
	image.toBuffer('PNG', function (err, buffer) {
		if (err) log.error(err);

		async.eachSeries(depths,
			function (depth, cb) {
				log.info('      Rendering depth '+depth+'/'+maxDepth);


				var count = Math.pow(2, depth);
				for (var i = 0; i < count; i++) ensureFolder(tileFolder+depth+'/'+i);
				var size = count*opts.tileSize;

				var layer = gm(buffer);
				layer.options({imageMagick: true});
				layer.in('-limit', 'area',   '8GiB');
				layer.in('-limit', 'memory', '8GiB');
				layer.in('-limit', 'map',    '8GiB');

				if (size != opts.imageSize) {
					layer.out('-filter', 'Box');
					layer.out('-resize', size+'x'+size);
				}

				layer.out('-crop', opts.tileSize+'x'+opts.tileSize);
				layer.out('-set', 'filename:tile');
				layer.out('%[fx:page.x/'+opts.tileSize+']/%[fx:page.y/'+opts.tileSize+']');
				layer.out('+repage');
				layer.out('+adjoin');
				layer.write(tileFolder+depth+'/%[filename:tile].png', function (err) {
					if (err) log.error(err);
					cb()
				});

			}, function () {
				callback();
			}
		)
	})
}

function stringToInt(text) {
	return parseInt(text, 10);
}

function ensureFolder(folder) {
	if (!fs.existsSync(folder)) {
		ensureFolder(path.dirname(folder));
		fs.mkdirSync(folder);
	}
}



exports.copy = copy;
exports.download = download;
exports.expandPattern = expandPattern;
exports.filesExist = filesExist;
exports.gmMultiOverlay = gmMultiOverlay;
exports.gmTiles = gmTiles;