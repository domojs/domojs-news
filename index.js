 $.on('message', function(message){
     var db=$.db.another();
     db._persistent=true;
     if(typeof(message)=='string')
        message={text:message};
     var id=message.id || 'notifications:'+Number(new Date());
     if(message.image)
        message.summary = '<img src="'+message.image+'" />' + message.text;
     db.select(1, function(){
         db.smembers('notifications:subscribers', function (err, subscribers) {
             if(err)
                console.error(err);
            
        var cmd = db.multi()
                .hmset(id, {
                title: message.title || '',
                summary: message.summary || message.text,
                description: message.text || '',
                date: message.date || new Date().toISOString(),
                pubDate: message.date || new Date().toISOString(),
                feed:'notifications:subscribers',
            });

            for (var i = 0; i < subscribers.length; i++)
                cmd = cmd.sadd(subscribers[i] + ':unread', id);
            cmd.exec(function (err) {
                if(err)
                    console.error(err);
            });
        });
    });
});