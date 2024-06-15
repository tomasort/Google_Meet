var peerConnectionManager = (function () {
    function _init(SDP_function, myConnId) {
        console.log("Init App Process");

    }
    function setNewConn(connId) {
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
            await setOffer(connId)
        }
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId);
            }
        }
    }

    return {
        setNewConn: async function (connId) {
            await setNewConn(connId);
        },
        init: async function (SDP_function, myConnId) {
            await _init(SDP_function, myConnId);
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

    function add_new_user_connection(other_user_id, connId) {
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
        var SDP_function = function (data, connId) {
            socket.emit("SDP_process", {
                messge: data,
                connId: connId
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
            add_new_user_connection(data.other_user_id, data.connId);
            peerConnectionManager.setNewConn(data.connId);
        });
    }

    return {
        _init: function (userId, meetingId) {
            init(userId, meetingId);
        }
    }
})();