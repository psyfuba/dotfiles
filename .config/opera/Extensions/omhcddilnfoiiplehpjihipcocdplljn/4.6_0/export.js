// Copyright (c) 2016 - Martin Sermak

var folders;
var bookmarks;
var closures;
var bookcount;

// run on install or after update
chrome.runtime.onInstalled.addListener(function(details)
{
	if (details.reason == "install")
	{
		var optpage = chrome.extension.getURL('popup.html');
		chrome.tabs.create({url:optpage,active:true},function(tab){});
	}
	else if (details.reason == "update")
	{
		var optpage = chrome.extension.getURL('popup.html');
		chrome.tabs.create({url:optpage,active:true},function(tab){});
	}
});

function ExportBook()
{
	bookcount = 0;
	folders = [ ];
	bookmarks = [ ];
	closures = [ ];

	// export bookmarks to arrays
	function fetch_bookmarks(parentNode)
	{
		parentNode.forEach(function(bookmark)
		{
			if (bookmark.children)
			{
				if (typeof bookmark.title != "undefined")
				{
					if (bookmark.title == null || bookmark.title == "") bookmark.title = "Untitled Folder";
					folders.push({"index":bookmark.id,"title":bookmark.title});
				}
				fetch_bookmarks(bookmark.children);
			}
			else
			{
				if (typeof bookmark.url != "undefined" && bookmark.title != "undefined")
				{
					bookcount++;
					if (bookmark.title == null || bookmark.title == "") bookmark.title = "Untitled Bookmark";
					bookmarks.push({"index":bookmark.parentId,"title":bookmark.title,"url":bookmark.url});
				}
			}
		});
	}
	chrome.bookmarks.getTree(function(rootNode){fetch_bookmarks(rootNode);SaveBook();});
}

function addFolder(name,from,to)
{
	chrome.bookmarks.create({title:name},function(node)
	{
		for (var z=bookmarks.length-1;z>=0;z--)
		{
			if (bookmarks[z].index > from && bookmarks[z].index < to)
			{
				chrome.bookmarks.create({title:bookmarks[z].title,url:bookmarks[z].url,parentId:node.id},function(){});
				bookmarks.splice(z,1);

				if (bookmarks.length == 0)
				{
					chrome.runtime.sendMessage({reply:"Import Successful, "+bookcount+" items saved to Imported folder."},function(response){});
				}
			}
		}
	});
}

function ImportBook(data)
{
	bookcount = 0;
	folders = [ ];
	bookmarks = [ ];
	closures = [ ];

	// find bookmarks
	var regex = /(<DT><A )(.*?)(HREF=\x22)(.*?)(\x22)(.*?)(>)(.*?)(<\/A>)/ig;
	var match = regex.exec(data);
	while (match != null && match.length > 9)
	{
		bookcount++;
		bookmarks.push({"index":match.index,"title":match[8],"url":match[4]});
		match = regex.exec(data);
	}
	// reverse bookmarks
	bookmarks.reverse();

	// find folders
	var regex = /(<DT><H3)(.*?)(>)(.*?)(<\/H3>)/ig;
	var match = regex.exec(data);
	folders.push({"index":0,"title":"Imported"});
	while (match != null && match.length > 4)
	{
		folders.push({"index":match.index,"title":match[4]});
		match = regex.exec(data);
	}

	// find bookmark closures
	var regex = /(<\/DL>)|(<DL>)/ig;
	var match = regex.exec(data);
	var temp = [ ];
	while (match != null && match.length > 0)
	{
		if (match[0] == "<DL>") { temp.push(match.index); }
		if (match[0] == "</DL>") { closures.push({"dlstart":temp.pop(),"dlend":match.index}); }
		match = regex.exec(data);
	}
	// abort if closures don't cancel each other out, otherwise sort them
	if (temp.length > 0)
	{
		chrome.runtime.sendMessage({reply:"Error found in Bookmark File, Aborting import procedure."},function(response){});
		return;
	}
	closures.sort(function(a,b){return b.dlstart - a.dlstart;});

	// start adding folders and bookmarks
	for (var x=folders.length-1;x>=0;x--)
	{
		for (var y=closures.length-1;y>=0;y--)
		{
			if (closures[y].dlstart > folders[x].index)
			{
				addFolder(folders[x].title,closures[y].dlstart,closures[y].dlend);
				closures.splice(y,1);
				break;
			}
		}
		folders.pop();
	}
}

function SaveBook()
{
	// save bookmark array to file
	var htmlCode = "<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n";

	for (var x=0;x<folders.length;x++)
	{
		var findit = folders[x].index;
		var found = false;

		// only process folders that have bookmarks
		for (var y=0;y<bookmarks.length;y++)
			if (bookmarks[y].index == findit) found = true;

		if (found == true)
		{
			htmlCode = htmlCode + "<DT><H3>" + folders[x].title + "</H3>\n<DL><p>\n";

			for (var z=0;z<bookmarks.length;z++)
				if (bookmarks[z].index == findit)
					htmlCode = htmlCode + "<DT><A HREF=\"" + bookmarks[z].url + "\">" + bookmarks[z].title + "</A></DT>\n";

			htmlCode = htmlCode + "</DL><p>\n</DT>\n";
		}
	}

	var url = "data:text/html;charset=utf-8," + encodeURIComponent(htmlCode);
	chrome.downloads.download({url:url,filename:"Bookmarks.html"},function(){});

	chrome.runtime.sendMessage({reply:"Export Successful, "+bookcount+" items saved to Downloads."},function(response){});
}

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse)
{
	// are we exporting or importing?
	switch(request.directive)
	{
		case "exportBook":
			ExportBook();
			break;

		case "importBook":
			ImportBook(request.data);
			break;
	}
});

chrome.browserAction.onClicked.addListener(function(tab)
{
	chrome.tabs.create({url:chrome.extension.getURL('popup.html')},function(tab){});
});
