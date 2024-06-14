const express = require("express");
const path = require("path");
var app = express();
// route server to port 3000
var server = app.listen(3000, function() {
    console.log("server is running on port 3000");
});
const io = require("socket.io")(server);
app.use(express.static(path.join(__dirname, "")));