var path = require('path');
var mainFolder = path.join(__dirname, '../../');

var config = {
	imageFolder: mainFolder+'images/',
	usermapFolder: mainFolder+'../31c3-usermap/renderings/',
	overview:{
		iso: {
			width:6790, height:13670,
			levels: [
				{ x:250, y:8800 },
				{ x:250, y:6600 },
				{ x:250, y:4400 },
				{ x:250, y:2200 },
				{ x:250, y:   0 }
			]
		},
		top: {
			width:5940, height:13092,
			levels: [
				{ x:400, y:8715 },
				{ x:400, y:6278 },
				{ x:400, y:4212 },
				{ x:400, y:2008 },
				{ x:400, y:-208 }
			]
		}
	}
}

module.exports = config;





