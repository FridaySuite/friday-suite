'use strict'
var winston = require('winston')
var path = require('path')
winston.emitErrs = true
winston.configure({
  transports: [
    new(winston.transports.File)({
      handleExceptions: true,
      json: true,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      colorize: false,
      name: 'info-file',
      dirname: path.join(__dirname.replace('/logger',''),'/logs/info/'),
      filename: 'file.log',
      level: 'info'
    }),
	new(winston.transports.File)({
      name: 'error-file',
      dirname: path.join(__dirname.replace('/logger',''),'/logs/error/'),
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
})
module.exports = winston
