var express = require("express"),
	app = express();


app.use(express.static("public"));


app.get("/", function(req, res) {
	res.render("index.html");
});



app.listen(3000, function() {
	console.log("server started successfuly");
});