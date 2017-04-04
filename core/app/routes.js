var logger = require('winston')
module.exports = function (app) {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    logger.error(err)
    res.send(err)
  })
  logger.info('Error Middleware Added successfully')
}
