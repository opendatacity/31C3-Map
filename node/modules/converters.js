var config = require('../config/config.js');
var log = require('./log.js');
var U = require('./myutils.js');

var fs = require('fs');
var path = require('path');

module.exports = {
	'originals': {
		checkSkip:function (opts, cb) {
			log.debug('\nconverters.originals.checkSkip');
			U.filesExist(U.expandPattern([path.join(config.imageFolder, 'originals/(0-4)_[iso,top].png')]),cb)
		},
		convert:function (opts, cb) {
			log.debug('\nconverters.originals.convert');

			U.copy(
				U.expandPattern([path.join(config.usermapFolder, '0[0_eg,(1-4)_og]_iso.png')]),
				U.expandPattern([path.join(config.imageFolder, 'originals/(0-4)_iso.png')]),
				function () {
					U.copy(
						U.expandPattern([path.join(config.usermapFolder, '0[0_eg,(1-4)_og]_topdown.png')]),
						U.expandPattern([path.join(config.imageFolder, 'originals/(0-4)_top.png')]),
						cb
					)
				}
			)
		}
	},
	'overview': {
		checkSkip:function (opts, cb) {
			log.debug('\nconverters.overview.checkSkip');
			U.filesExist([path.join(config.imageFolder, 'overview/overview_'+opts+'.png')], cb)
		},
		convert:function (opts, cb) {
			log.debug('\nconverters.overview.convert');
			var conf = config.overview[opts];
			U.gmMultiOverlay({
				width:conf.width,
				height:conf.height,
				background:'#EEEEEE',
				filename:'overview/overview_'+opts+'.png',
				layers: conf.levels.map(function (level, index) { return {
					filename:'originals/'+index+'_'+opts+'.png',
					x: level.x,
					y: level.y
				} })
			}, cb)
		}

	},
	'tiles': {
		checkSkip:function (opts, cb) {
			log.debug('\nconverters.tiles.checkSkip');
			U.filesExist([path.join(config.tileFolder, '/'+opts)], cb)
		},
		convert:function (opts, cb) {
			log.debug('\nconverters.overview.convert');

			var conf = config.overview[opts];
			var imageSize = 16*1024;
			U.gmTiles({
				filename:'overview/overview_'+opts+'.png',
				tileFolder:'/'+opts+'/',
				tileSize:256,
				background:'#EEEEEE',
				imageSize:imageSize,
				offsetX: Math.floor((imageSize-conf.width )/2),
				offsetY: Math.floor((imageSize-conf.height)/2)
			}, cb)
		}
	},
	'webconfig': {
		convert:function (opts, cb) {
			log.debug('\nconverters.webconfig.convert');

			var webConfig = {
				map: {
					tileLayers: []
				}
			};

			Object.keys(config.overview).forEach(function (key) {
				var layer = config.overview[key];
				var size = 16384;
				var offsetX = (size - layer.width )/2;
				var offsetY = (size - layer.height)/2;
				var levels = layer.levels.map(function (level) {
					var x0 = level.x + offsetX;
					var y0 = level.y + offsetY;
					return {
						p0: [x0, y0],
						dx: [1, 0],
						dy: [0, 1],
						c:  [x0 + (level.cx || 0), y0 + (level.cy || 0)]
					}
				})

				webConfig.map.tileLayers.push({
					title: layer.title,
					name: layer.name,
					tileUrl: 'tiles/'+key+'/{z}/{x}/{y}.png',
					levels: levels
				})
			})

			webConfig = JSON.stringify(webConfig, null, '\t');
			webConfig = 'var config = ' + webConfig;

			fs.writeFileSync(config.webConfigFile, webConfig, 'utf8');

		}
	}
}