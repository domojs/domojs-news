 $.on('message', function(message){
     var db=$.db.another();
     if(!message.text)
        message={text:message};
     var id='notifications:'+Number(new Date());
     db.select(1, function(){
         db.smembers('notifications:subscribers', function (err, subscribers) {
            
        var cmd = db.multi()
                .hmset(id, {
                title: message.title,
                summary: message.text,
                description: message.text ,
                date: new Date(item.date).toISOString(),
                pubDate: new Date(item.date).toISOString(),
                feed:'notifications:subscribers',
            });

            for (var i = 0; i < subscribers.length; i++)
                cmd = cmd.sadd(subscribers[i] + ':unread', id);
            cmd.exec(function (err) {
                if (err)
                    callback(500, err);
            });
        });
    });
});