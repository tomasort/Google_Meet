const express = require("express");
const path = require("path");
var app = express();

var server = app.listen(3000, function() {
    console.log("server is running on port 3000");
});

const io = require("socket.io")(server);
app.use(express.static(path.join(__dirname, "")));

// TODO: refactor this code to use a database to store user connections
var userConnections = [];

io.on("connection", (socket) => {
    socket.on("user_connect", (data) => {
        console.log("User connected: ", data.userId, " Meeting ID: ", data.meetingId);
        // get the users with the same meeting ID
        var other_users = userConnections.filter((p) => p.meetingId == data.meetingId);
        userConnections.push({
            socketId: socket.id,
            userId: data.userId,
            meetingId: data.meetingId
        });
        // send the other users in the conference the new user's connection details
        other_users.forEach((v) => {
            console.log("Emitting to: ", v.userId);
            socket.to(v.socketId).emit("new_participant", {
                other_user_id: data.userId,
                connId: socket.id
            });
        });
        socket.emit("inform_me_about_other_users" , other_users);
    });
    socket.on("SDP_process", (data) => {
        console.log("SDP Process: ", data.toConnId);
        socket.to(data.toConnId).emit("SDP_process", {
            message: data.message,
            fromConnId: socket.id
        });
    });
});