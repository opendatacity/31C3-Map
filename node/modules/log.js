var colors = require('colors');
var util = require('util');

exports.debug = function (obj) {
	console.log(obj2String(obj, 'grey'))
}

exports.info = function (obj) {
	console.log(obj2String(obj, 'green'))
}

exports.warn = function (obj) {
	console.warn(obj2String(obj, 'yellow'))
}

exports.error = function (obj) {
	console.error(obj2String(obj, 'red'))
}

function obj2String(obj, color) {
	if (obj === undefined) return '';

	var type = typeof obj;
	switch (type) {
		case 'string': return obj[color];
		case 'number': return obj.toString()[color];
		default:
			return util.inspect(obj)[color];
	}
}
