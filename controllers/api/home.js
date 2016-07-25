exports.refresh= function refresh(db, callback) {
    db.select(1, function(){
        db.smembers('feeds', function (err, feeds) {
            if (err) {
                console.log(-1);
                callback(500,err);
                return;
            }
            //console.log(feeds);
            var feedLeft = feeds.length;
            var feedParser = require('../../rss.js');
            var results={};
            feeds.forEach(function (feed) {
                feedParser(feed, function (articles, meta) {
                    if (!isNaN(Number(articles))) //articles may be an error code
                        results[feed]={success:false, error:$('util').inspect(meta)};
                    else
                        results[feed]={success:true, feed:meta};
                    feedLeft--;
                    if (feedLeft == 0)
                        callback(200, results);
                });
            });
            if (feedLeft == 0)
                callback(200, results);
        });
    });
};

