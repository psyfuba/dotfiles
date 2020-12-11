// Copyright (c) 2016 - Martin Sermak

function importBook()
{
	var fileInput = document.getElementById('fileInput');
	var file = fileInput.files[0];
	if (typeof file == "undefined")
	{
		document.getElementById('infoPanel').innerHTML = "Please select a Bookmark File to Import, and then try again.";
		return;
	}

	var reader = new FileReader();
	reader.onloadend = function()
	{
		chrome.runtime.sendMessage({directive:"importBook",data:reader.result},function(response){});
	}
	reader.readAsText(file);
}

function exportBook()
{
	chrome.runtime.sendMessage({directive:"exportBook"},function(response){});
}

document.addEventListener('DOMContentLoaded',function()
{
	document.getElementById('importBook').addEventListener('click',importBook);
	document.getElementById('exportBook').addEventListener('click',exportBook);
})

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse)
{
	if (request.reply) document.getElementById('infoPanel').innerHTML = request.reply;
});
