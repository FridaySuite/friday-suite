/*jslint node: true */
/*global module, require*/
'use strict';
var winston = require('winston');
winston.emitErrs = true;

var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.File)({
			handleExceptions: true,
			json: true,
			maxsize: 5242880, //5MB
			maxFiles: 5,
			colorize: false,
			name: 'info-file',
			dirname: 'logs/info/',
			filename: 'file.log',
			level: 'info'
		}),
		new (winston.transports.File)({
			name: 'error-file',
			dirname: 'logs/error',
			filename: 'file.log',
			level: 'error'
		}),
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			json: false,
			colorize: true
		})
	]
});

module.exports = logger;
module.exports.stream = {
	write: function (message, encoding) {
		logger.info(message);
	}
};