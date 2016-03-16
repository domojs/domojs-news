route.on('news', function(url, params, unchanged){
    $.ajax(loadHtml('/news', function(){
        function toggleRead(read) {
            var articleTag=$('#articles .active');
            if(articleTag.hasClass('hidden'))
                return;
            var article=articleTag.data('article');
            if (article.sticky && typeof(read)!='undefined')
                return;
            if (typeof (read) == 'undefined') {
                read = !article.read;
                article.sticky = !read;
            }
            var self = this;
            var url = 'api/news/rss/';
            if (read)
                url += 'readArticle';
            else
                url += 'unreadArticle';
            $.getJSON(url+'/'+encodeURIComponent(article.id), function() {
                article.read = read;
                articleTag.toggleClass('disabled', read);
                loadTabs();
            });
        }
        
        var activeTag='all';
        
        $('#addFeed').on('hide.bs.modal', function(){
            var url=$('#addFeed input.url').val();
            if(!url)
                return;
            addFeed(url);
        });
        
        var loadTabs=function(){
            $.getJSON('/api/news/tags', function(tags){
                $.each(tags, function(i, tagObj){
                    var tag=$('#tags-'+this.name);
                    if(tag.length==0)
                    {
                        tag=$('<li><a href><span class="name"></span><span class="pull-right badge"></span></a></li>').attr('id', 'tags-'+this.name);
                        if(this.name=='all')
                        {
                            tag.addClass('active');
                            tag.prependTo('#tags');
                        }
                        else
                            tag.appendTo('#tags');
                        tag.find('a').click(function(){
                            activeTag=tagObj.name;
                            $('#tags .active').removeClass('active');
                            tag.addClass('active');
                            loadMore(0);
                            return false;
                        })
                    }
                    if(this.name=='all')
                        tag.find('.name').text('Tous les articles');
                    else
                        tag.find('.name').text(this.name);
                    tag.find('.badge').text(this.count);
                });
            });
        };
        loadTabs();
        
        var addFeed=function(url, tags){
            $.ajax({
                type:'post',
                url:'/api/news/rss/addFeed',
                data:JSON.stringify({
                    feed:url,
                    tags:tags
                }),
                dataType:'json',
                contentType :'application/json',
                success:function(){
                    $.gritter.add('feed successfully added');
                },
                error:function(error){
                    $.gritter.add(error);
                }
            });
        }

        
        var loadMore=function(from)
        {
            if(typeof(from)=='undefined')
            {
                from=$('#articles li').length-2;
            }
            $.getJSON('/api/news/rss/unread?from='+from+'&tag='+activeTag, function(articles){
                if(from===0)
                {
                    $('#articles').empty();
                    $('<li class="list-group-item hidden active"></li>').appendTo('#articles');
                }
                else
                {
                    $('li.list-group-item.hidden:last').remove();
                }
                $.each(articles, function(i){
                        var articleTag=$('<li class="list-group-item">\
                            <span class="date pull-right"></span>\
                            <h4><a class="list-group-item-heading" target="_blank"></a></h4>\
                            <p class="list-group-item-text"></p>\
                        </li>');
                        articleTag.data('article', this);
                        articleTag.find('.date').text(new Date(this.date).relative('fr'));
                        articleTag.find('h4 a').attr('href', this.link).text(this.title);
                        articleTag.find('p').html(this.description);
                        articleTag.appendTo('#articles');
                });
                $('<li class="list-group-item hidden"></li>').appendTo('#articles');
                if(from===0)
                    scrollTo($('#articles .active + li:first'));
                else
                    scrollTo($('#articles .active'));
            });
        };
        
        var reload=function(){
            loadMore(0);
        };
        
        var scrollTo=function(element)
        {
			var min = element.position().top + element.outerHeight();
			var maxHeight = window.innerHeight;
			var idealPosition = maxHeight / 2;
			if (element.outerHeight() - idealPosition > 0)
				element.parents().scrollTop(min - element.outerHeight());
			else
				element.parents().scrollTop(element.position().top - idealPosition);
        };
        
        var next=function(){
            if($('#articles .active').index()<$('#articles li').length-1)
            {
                $('#articles .active').next().addClass('active');
                $('#articles .active:first').removeClass('active');
                scrollTo($('#articles .active'));
            }
            if($('#articles .active').index()+5>$('#articles li').length)
                loadMore();
            toggleRead(true);

        };
        var prev=function(){
            if($('#articles .active').index()>0)
            {
                $('#articles .active').prev().addClass('active');
                $('#articles .active:last').removeClass('active');
                scrollTo($('#articles .active'));
            }
            toggleRead(true);
        };
        
        reload();
        
        $('#articles').focus()
        .bindKey('r', reload)
        .bindKey('m', function(){
            toggleRead();
        })
        .bindKey('v', function(){
            var link = $('<a></a>');
            link.appendTo('body');
            link.attr('target', '_blank');
            link.attr('href', $('#articles .active a').attr('href'));
            var ev = new MouseEvent('click', {
                bubbles: false,
                cancelable: false,
                view: window
            });
            link[0].dispatchEvent(ev);
        })
        .bindKey('n', next)
        .bindKey('down', next)
        .bindKey('up', prev)
        .bindKey('p', prev)
        .bindKey('w', function(){
            $('#articles').toggleClass('mini-mode');
        })
        ;
    })); 
});