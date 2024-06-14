var myapp = (function(){
    var socket=null;
    var userId = null;
    var meetingId = null;

    function init(uid, mid){
        userId = uid;
        meetingId = mid;
        console.log('User ID: ', uid);
        console.log('Meeting ID: ', mid);
        event_process_for_signaling_server();
    }

    function event_process_for_signaling_server() {
        socket = io.connect("http://192.168.1.2:3000");
        socket.on("connect", function(){
            console.log("Connected to signaling server");
            if (socket.connected) {
                if (userId && meetingId) {
                    socket.emit("user_connect", {
                        userId: userId,
                        meetingId: meetingId
                    });
                }
            }
        });
    }
    return {
        _init: function(userId, meetingId){
            init(userId, meetingId);
        }
    }
})();