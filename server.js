const express = require("express");
const path = require("path");
var app = express();

var server = app.listen(3000, function() {
    console.log("server is running on port 3000");
});

const io = require("socket.io")(server);
app.use(express.static(path.join(__dirname, "")));


io.on("connection", (socket) => {
    socket.on("user_connect", (data) => {
        console.log("User connected: ", data.userId);
        console.log("Meeting ID: ", data.meetingId);
    });
});