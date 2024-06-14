var myapp = (function(){
    function init(userId, meetingId){
        console.log('User ID: ', userId);
        console.log('Meeting ID: ', meetingId);
    }
    return {
        _init: function(userId, meetingId){
            init(userId, meetingId);
        }
    }
})();