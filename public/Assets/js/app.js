var peerConnectionManager = (function () {
    var serverProcess = null;
    var peers_connection_ids = [];
    var peers_connection = [];
    var remote_vid_stream = [];
    var remote_aud_stream = [];

    async function _init(SDP_function, mcid) {
        serverProcess = SDP_function;
        myConnId = mcid;
    }

    async function setOffer(connId) {
        var connection = peers_connection[connId];
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({ offer: offer }), connId);
    }

    async function SDPProcess(data, connId) { 
        var connection = peers_connection[connId];
        var message = JSON.parse(data);
        if (message.answer) {
            await peers_connection[connId].setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.offer){
            if (connection == null) {
                await setConnection(connId);
            }
            await connection.setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            serverProcess(JSON.stringify({ answer: answer }), connId);
        } else if (message.icecandidate) {
            if (connection == null) {
                await setConnection(connId);
            }
            try {
                await connection.addIceCandidate(message.icecandidate);
            } catch (e) {
                console.error("Error adding received ice candidate", e);
            }
        }
    }

    // create a new connection to a peer with the given ID
    async function setNewConn(connId) {
        console.log("New Connection: ", connId);
        var connection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                },
                {
                    urls: "stun:stun1.l.google.com:19302"
                }
            ]
        });

        connection.onnegotiationneeded = async () => {
            await setOffer(connId);
        }

        connection.onicecandidate = (event) => {
            if (event.candidate) {
                serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId);
            }
        }

        connection.ontrack = (event) => {
            if (remote_vid_stream[connId] == null) {
                remote_vid_stream[connId] = new MediaStream();
            }
            if (remote_aud_stream[connId] == null) {
                remote_aud_stream[connId] = new MediaStream();
            }
            if (event.track.kind == "video") {
                remote_vid_stream[connId].getVideoTracks().forEach((t) => {
                    remote_vid_stream[connId].removeTrack(t);
                });
                remote_vid_stream[connId].addTrack(event.track);
                var remoteVideoPlayer = document.getElementById("v_" + connId);
                remoteVideoPlayer.srcObject = remote_vid_stream[connId];
                remoteVideoPlayer.load();
            } 
            if (event.track.kind == "audio") {  
                remote_aud_stream[connId].getAudioTracks().forEach((t) => {
                    remote_aud_stream[connId].removeTrack(t);
                });
                remote_aud_stream[connId].addTrack(event.track);
                var remoteAudioPlayer = document.getElementById("a_" + connId);
                remoteAudioPlayer.srcObject = remote_aud_stream[connId];
                remoteAudioPlayer.load();
            }
        };
        peers_connection_ids[connId] = connId;
        peers_connection[connId] = connection;

        return connection
    }

    return {
        setNewConn: async function (connId) {
            await setNewConn(connId);
        },
        init: async function (SDP_function, ConnId) {
            await _init(SDP_function, ConnId);
        },
        processClientFunction: async function (data, ConnId) {
            await SDPProcess(data, ConnId);
        }
    };
})();

var rtcClient = (function () {
    var socket = null;
    var userId = null;
    var meetingId = null;

    function init(uid, mid) {
        userId = uid;
        meetingId = mid;
        console.log('User ID: ', uid);
        console.log('Meeting ID: ', mid);
        event_process_for_signaling_server();
    }

    // add new user to the conference UI
    function addUser(other_user_id, connId) {
        var newDivid = $("#otherTemplate").clone();
        newDivid = newDivid.attr("id", connId).addClass("other");
        newDivid.find("h2").text(other_user_id);
        newDivid.find("video").attr("id", "v_" + connId);
        newDivid.find("audio").attr("id", "a_" + connId);
        newDivid.show();
        $("#divUsers").append(newDivid);
    }


    function event_process_for_signaling_server() {
        socket = io.connect("http://192.168.1.2:3000");
        var SDP_function = function (data, toConnId) {
            socket.emit("SDP_process", {
                messge: data,
                toConnId: toConnId
            });
        }
        socket.on("connect", function () {
            console.log("Connected to signaling server");
            if (socket.connected) {
                peerConnectionManager.init(SDP_function, socket.id);
                if (userId && meetingId) {
                    socket.emit("user_connect", {
                        userId: userId,
                        meetingId: meetingId
                    });
                }
            }
        });
        // listen for new participant
        socket.on("new_participant", function (data) {
            console.log("New participant added ", data);
            addUser(data.other_user_id, data.connId);
            peerConnectionManager.setNewConn(data.connId);
        });

        socket.on("inform_me_about_other_users", function (other_users) {
            console.log("Inform me about other users");
            if (other_users.length > 0){
                for (var i = 0; i < other_users.length; i++) {
                    console.log("Inform me about other users: ", other_users[i].userId);
                    addUser(other_users[i].userId, other_users[i].socketId);
                    peerConnectionManager.setNewConn(other_users[i].socketId);
                }
            }
        });

        socket.on("SDP_process", async function (data) {
            console.log("SDP Process: ", data);
            await peerConnectionManager.processClientFunction(data.message, data.fromConnId);
        });
    }

    return {
        _init: function (userId, meetingId) {
            init(userId, meetingId);
        }
    }
})();