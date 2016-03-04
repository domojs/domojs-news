var rss = require('feedparser');
var http = require('request');
var zlib = require('zlib');
var htmlparser=require('htmlparser2');

module.exports = function (url, callback) {
    var db=$.db.another();
    db.select(1, function(){
        db.smembers(url + ':subscribers', function (err, subscribers) {
            var feed = new rss({ resume_saxerror: false });
            if (err)
            {
                return callback(500, err);
            }
            var request = http(url);
            var stop=false;
            request.on('error', function(error){
                callback(500, error);
                stop=true;
            });
            request.on('response', function (res) {
                if(stop)
                    return;
                var encoding = res.headers['content-encoding'];
                //console.log(encoding);
                var contentType=res.headers['content-type'];
                if (encoding == 'gzip') {
                    res=res.pipe(zlib.createGunzip());
                }
                else if (encoding == 'deflate') {
                    res=res.pipe(zlib.createInflate());
                }
                
                if(contentType=='text/html')
                {
                    htmlParser.DefaultHandler(function (error, dom) {
                        var findByTagName=function(dom, tagName)
                        {
                            var result=[];
                            if(dom.length>0)
                            {
                                for(var i in dom)
                                {
                                    if(dom[i].name == tagName)
                                    {
                                        result.push(dom[i]);
                                    }
                                    if(typeof(dom[i].children)!='undefined')
                                    {
                                        //console.log(dom[i]);
                                        result=result.concat(findByTagName(dom[i].children, tagName));
                                    }
                                }
                            }
                            return result;
                        };
                        
                        if (error)
                        {
                            console.log(error);
                            callback(500, error);
                        }
                        else
                        {
                            var linkFound=false;
                            $.each(findByTagName(dom, 'link'), function(index, link)
                            {
                                if(!linkFound && (link.attribs.type=='application/atom+xml' || link.attribs.type=='application/rss+xml'))
                                {
                                    linkFound=link.attribs.href;
                                }
                            });
                            if(!linkFound)
                                callback(404, 'No Rss feed found');
                            else
                                module.exports(linkFound, callback);
                        }
                    });
                    
                    var parser = new htmlParser.Parser(handler);
                    res.pipe(parser);
                }
                else
                {
                    res.pipe(feed);
                }
            });
            var articles = [];
            feed.on('data', function (item) {
                var id = item['rss:guid']['#'];
                if (item['rss:guid']['@'].ispermalink === 'false')
                    id = item.meta.link + id;
                id = 'article:' + id;
                db.hget(id, 'pubDate', function (err, exists) {
                    var cmd = db.multi()
                        .hmset(id, {
                        title: item.title,
                        summary: item.summary,
                        description: item.description,
                        date: new Date(item.date).toISOString(),
                        pubDate: item.pubDate,
                        link: item.link,
                        feed:url,
                    });
                    if (exists != item.pubDate)
                        for (var i = 0; i < subscribers.length; i++)
                            cmd = cmd.sadd(subscribers[i] + ':unread', id);
                    cmd.exec(function (err) {
                        if (err)
                            callback(500, err);
                    });
                });
                articles.push(id);
            });
            feed.on('error', function (error) {
                console.log(3);
                console.log(error);
                callback(500, error);
            });
            feed.on('end', function () {
                console.log('end');
                callback(articles, this.meta);
            });
        });
    });
}; 