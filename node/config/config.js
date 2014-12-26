var path = require('path');
var mainFolder = path.join(__dirname, '../../');

var isoFloorMargin = -100;
var topFloorMargin = -100;

var config = {
	imageFolder: mainFolder+'images/',
	tileFolder: mainFolder+'web/tiles/',
	usermapFolder: mainFolder+'../31c3-usermap/renderings/',
	overview: {
		iso: {
			width:6790, height:13670 + 4*isoFloorMargin,
			levels: [
				{ x:250, y:8800 + 4*isoFloorMargin },
				{ x:250, y:6600 + 3*isoFloorMargin },
				{ x:250, y:4400 + 2*isoFloorMargin },
				{ x:250, y:2200 + 1*isoFloorMargin },
				{ x:250, y:   0 + 0*isoFloorMargin }
			]
		},
		top: {
			width:5940, height:13092 + 4*topFloorMargin,
			levels: [
				{ x:400, y:8715 + 4*topFloorMargin },
				{ x:400, y:6278 + 3*topFloorMargin },
				{ x:400, y:4212 + 2*topFloorMargin },
				{ x:400, y:2008 + 1*topFloorMargin },
				{ x:400, y: 208 + 0*topFloorMargin }
			]
		}
	}
}

module.exports = config;





