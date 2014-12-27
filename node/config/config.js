var path = require('path');
var mainFolder = path.join(__dirname, '../../');

var config = {
	imageFolder: mainFolder+'images/',
	tileFolder: mainFolder+'web/tiles/',
	usermapFolder: mainFolder+'../31c3-usermap/renderings/',
	webConfigFile: mainFolder+'web/config.js',
	overview: {
		top: {
			title: 'Top Down',
			name: 'top',
			width: 5140,
			height: 12690 - 1100,
			levels: [
				{ x:0, y:8510 - 1100 },
				{ x:0, y:6090 -  800 },
				{ x:0, y:4010 -  600 },
				{ x:0, y:1800 -  300 },
				{ x:0, y:   0 -  400 }
			]
		},
		iso: {
			title: 'Pseudo 3D',
			name: 'iso',
			width: 6790,
			height: 13670 - 400,
			levels: [
				{ x:250, y:8800 - 400 },
				{ x:250, y:6600 - 300 },
				{ x:250, y:4400 - 200 },
				{ x:250, y:2200 - 100 },
				{ x:250, y:   0 - 000 }
			]
		}
	}
}

module.exports = config;





