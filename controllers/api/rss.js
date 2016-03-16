function trueAddFeed(db, url, userId, tags, articles, meta, callback) {
    var cmd = db.multi()
        .sadd('feeds', url)
        .sadd(userId + ':subscriptions', url)
        .hmset(url, { title: meta.title, link: meta.link })
        .sadd(url + ':subscribers', userId+':tag:all')
        .sadd([userId + ':tag:all:unread'].concat(articles))
        .sadd(userId+':tags', userId+':tag:all');
    for (var i = 0; tags && i < tags.length; i++)
        cmd = cmd.sadd(userId + ':tag:' + tags[i], url)
            .sadd(userId + ':tags', tags[i])
            .sadd(url + ':subscribers', userId+':tag:'+tags[i]);
    cmd.exec(function (err, result) {
        if (err)
            callback(500, err);
        else
            callback(200, result);
    });
}

function unread(db, key, from, count, callback) {
    db.select(1, function(err){
        if (err) {
            console.error(err);
            callback(500, err);
            return;
        }
        
        console.log(key);
        db.sort(key, 'by', '*->date', 'limit', from, count, 'get', '*->date', 'get', '*->title', 'get', '*->summary', 'get', '#', 'get', '*->link', 'alpha', function (err, results) {
            if (err) {
                console.error(err);
                callback(500, err);
                return;
            }
            var items = [];
            for (var i = 0; i < results.length;) {
                items.push({ date: results[i++], title: results[i++], description: results[i++], id: results[i++], link: results[i++] });
            }
            //console.log(items);
            callback(200, items);
        });
    });
}

module.exports={
    addFeed:function addFeed(db, body, user, callback) {
        var feed=body.feed;
        var tags=body.tags;
        if(!feed)
            return callback(404, 'missing url');
        db.select(1, function(){
            db.sort(feed, 'by', '*->date', 'desc', 'limit', 0, 10, function (err, articles) {
                if (err)
                    callback(500, err);
                if (articles.length) {
                    db.hgetall(feed, function (err, meta) {
                        if (err)
                            return callback(500, err);
                        return trueAddFeed(db, feed, user, tags, articles, meta, callback);
                    });
                    return;
                }
                require('../../rss.js')(feed, function (articles, meta) {
                    console.log(articles);
                    if(isNaN(Number(articles)))
                        trueAddFeed(db, feed, user, tags, articles.slice(0, Math.min(articles.length, 10)), meta, callback);
                    else
                        callback(articles, meta); //actually articles is error code and and meta is error message
                });
            });
        });
    },
    unread:function unreadAll(db, user, from, callback) {
        unread(db, user + ':tag:all:unread', from || 0, 50, callback);
    },
    unreadTab:function unreadTab(db, user, tag, from, callback) {
        unread(db, user + ':tag:' + tag + ':unread', from || 0, 50, callback);
    },
    readArticle:function readArticle(db, user, id, callback) {
        console.log(user);
        db.select(1, function(){
            db.smembers(user+':tags', function(err, tags){
                 if (err)
                        return callback(500, err);
                   
                var cmd = db.multi();
                $.each(tags, function(i, tag){
                    cmd=cmd.srem(tag+':unread', id);
                });
                cmd.srem(user + ':unread', id).exec(function (err) {
                    if (err)
                        callback(500, err);
                    else
                        callback(204);
                });
            });
        });
    },
    unreadArticle:function unreadArticle(db, user, id, callback) {
        db.select(1, function(){
            db.hget(id, 'feed', function(err, url){
                if (err)
                    return callback(500, err);
                
            db.sinter(url+':subscribers', user+':tags', function(err, tags){
                if (err)
                    return callback(500, err);
                        
                    var cmd = db.multi()
                        .sadd(user + ':unread', id);
                       
                   $.each(tags, function(i, tag){
                       cmd=cmd.sadd(tag+':unread', id);
                   });
                        
                    cmd.exec(function (err) {
                        if (err)
                            callback(500, err);
                        else
                            callback(204);
                    });
                });
            })
        })
    }
};