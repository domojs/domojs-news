exports.get=function get(db, user, callback) {
    db.select(1, function(){
        db.smembers(user + ':tags', function (err, tags) {
            console.log(arguments);
            if (err)
                return callback(500, err);
            
            if(tags==null || tags.length==0)
                return callback([]);
            var cmd=db.multi();
            $.each(tags, function(i, tag){
                cmd=cmd.scard(tag+':unread');
            })
            cmd.exec(function(err, results){
                callback($.map(tags, function(tag, i){
                        return {name:tag.substr((user+':tag:').length), count:results[i]};
                }));
            })
        });
    });
};