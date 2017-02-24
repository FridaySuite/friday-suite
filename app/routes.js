module.exports = function(app) {
    console.log("error middleware added");
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        console.log("Error is : ");
        console.log(err);
        res.send(err);
    });
};
