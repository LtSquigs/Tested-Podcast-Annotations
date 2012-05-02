
databaseJunk = [] // Contains the list of annotations from the database
popups = {} // A dictionary where the keys are timestamps and values are arrays of popup divs
			// Used to relate timestamps with what popups should be displayed at those timestamps
            
currentlyShowing = [] // Dictionary of popups currently open
allPopups = [] // Array of all popups created

// Converts a strings of form "hh:mm:ss" to seconds
function timeToSeconds(timeStr)
{
	var parts = timeStr.split(':');
	
	var seconds = (parts[0] * 60 * 60) + (parts[1] * 60) + (parts[2] * 1);
	return seconds;
}

// Converts seconds into a string of form "hh:mm:ss"
function secondsToTime(seconds)
{
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor((seconds - (hours * 60 * 60)) / 60);
    var seconds = Math.floor((seconds - (hours * 60 * 60) - (minutes * 60)));
    
    var hrStr = '' + hours;
    var mnStr = '' + minutes;
    var secStr = '' + seconds;
    
    if(hours < 10)
        hrStr = '0' + hrStr;
        
    if(minutes < 10)
        mnStr = '0' + mnStr;
        
    if(seconds < 10)
        secStr = '0' + secStr;
    
    return hrStr + ":" + mnStr + ":" + secStr;
}

var podcastID = '0'; // ID of podcast
var updateInterval = null; // Used to keep track of the update interval function

// Gets the podcast ID, sets up the Add Annotation button
// registeres the delete button event for annotations, and then updates the annotations 
$(document).ready(function () {

	podcastID = $('.podcast-player .info .title').text().split(' ')[1];

    AddShowHideButton();
    AddAnnotationPanel();
    
	$(document).on("click", ".annotDeleteButton", function () {
		var id = $(this).attr('data-annote-id');
		$.ajax({ url : 'http://testedannotations.appspot.com/',
				 type: "POST",
				 data: {'command' : 'delete', 'CommentID' : id},
				 dataType: 'json',
				 async: false
		});
		
		$('#annotePopup-' + id).HideBubblePopup();
		UpdateAnnotations();
	});
	
	UpdateAnnotations();
    
});

// Skips to a timestamp in the podcast
// Can only get reasonably "close" to the timestamp, due to not having direct access to the sound manager
// Podcast must already have buffered to this timestamp
function SkipToTimestamp(timestamp) 
{ 
    var totalDuration = timeToSeconds($('.duration').text());
    var targetDuration = timeToSeconds(timestamp);
    
    var buffer = $('.buffer');
    
    var targetWidth = (targetDuration/totalDuration) * buffer.width();
    var clickPosX = buffer.offset().left + targetWidth;
    var clickPosY = buffer.offset().top + 5;
    
    var customEvent2 = document.createEvent('MouseEvents');
    customEvent2.initMouseEvent('click', true, true, window, 0, clickPosX, clickPosY, clickPosX, clickPosY, false, false, false, false, 0, null);
    
    buffer.get()[0].dispatchEvent(customEvent2);
}

var hidden = false;

// Creates the "Show/Hide" Button that is attached to the podcast player
function AddShowHideButton()
{

    var showButton = $('<span id="ShowAnnotationsButton" style=\'margin-left: 5px; padding-left: 5px; padding-right: 5px; background: #EFF200; color:black; cursor:pointer;\'>Show</span>');
    var hideButton = $('<span id="HideAnnotationsButton" style=\'padding-left: 5px; padding-right: 5px; background: white; color:black; cursor:pointer;\'>Hide</span>');
    var container = $('<section style=\'color:white; position: absolute; right: 5px; bottom: 3px; font: normal 13px "NimbusSanNovConD-Bol","Helvetica Neue",Helvetica,Arial,sans-serif; text-transform: uppercase;\'>Annotations:</section>');
    
    container.append(showButton);
    container.append(hideButton);
    $('.player').append(container);
    
    showButton.click( function () {
        if(!hidden) return;
        
        showButton.css('background', '#EFF200');
        hideButton.css('background', 'white');
        
        UpdateAnnotations();
        $('#AnnotationPanel').slideDown();
        hidden = false;
    });
    
    hideButton.click( function () {
        if(hidden) return;
        
        hideButton.css('background', '#EFF200');
        showButton.css('background', 'white');
        
        $('#AnnotationPanel').slideUp(400, ClearAnnotations);
        
        hidden = true;
    });
}

// Creates the panel that both lists the annotations on a podcast and
// lets users add new annotations
function AddAnnotationPanel()
{
    var panel = '<div id="AnnotationPanel" style="background: white;padding: 20px;padding-top: 0px;">' +
                    '<section style=\'background: black; color: white; padding: 20px; font: normal 15px "NimbusSanNovConD-Bol","Helvetica Neue",Helvetica,Arial,sans-serif;\'>' +
                        '<section style="float: left; width: 640px; display: block; ">' +
                            '<header style=\'display: block;  text-transform: uppercase; font-size: 30px;\'>Annotations</header>' + 
                            '<section id="AnnotationList" style=\'font-size: 15px; font-family: "NimbusSanNovConD","Helvetica Neue",Helvetica,Arial,sans-serif; font-weight: bold;\'>' +
                            '</section>' +
                        '</section>' +
                        
                        '<section style="float: left; display: block; ">'+
                            '<header style=\'display: block; font-size: 30px; text-transform: uppercase;\'>Add Your Own?</header>' +
                            '<section style=\'display: block; font-size: 18px; text-transform: uppercase;\'>To add links: [Link Text]{Link Url}</section>' +
                            '<section style="margin-top: 20px;">' +
                                '<input type="text" id="AddAnnotationTextBox" placeholder="Comment..." style="height: 28px; width: 240px; position: relative; top: -2px; padding-left: 5px; padding-right: 5px;"></input>' +
                                '<span id="AddAnnotationButton" style=\'cursor: pointer; border: 1px white solid; margin-left: 10px; padding: 5px; background: #EFF200; color:black; font-size: 18px; text-transform: uppercase;\'> Add Comment</span>' +
                            '</section>' +
                        '</section>' +
                        
                        '<div style="clear:both;"></div>'+
                    '</section>'+
                '</div>';
                
    $('.podcast-player').parent().append($(panel));
    
    $('#AddAnnotationTextBox').keypress( function(e) {
        if(!(e.which == 13)) return;
    
        var timeStamp = timeToSeconds($('.time-position').text());
        var user = $('.user-auth').find('span').text().split(' ')[1].replace(/\./g, ''); // Replace with user name
        var comment = $('#AddAnnotationTextBox').val();
        
        $.ajax({ url : 'http://testedannotations.appspot.com/',
                 type: "POST",
                 data: {'command' : 'add', 'PodcastID' : podcastID, 'TimeStamp' : timeStamp, 'Comment' : comment, 'User' : user},
                 dataType: 'json',
                 async: false
        });
        
        UpdateAnnotations();
        
        e.preventDefault();
    });
    
    $('#AddAnnotationButton').click( function() {
        var timeStamp = timeToSeconds($('.time-position').text());
        var user = $('.user-auth').find('span').text().split(' ')[1].replace(/\./g, ''); // Replace with user name
        var comment = $('#AddAnnotationTextBox').val();
        
        $.ajax({ url : 'http://testedannotations.appspot.com/',
                 type: "POST",
                 data: {'command' : 'add', 'PodcastID' : podcastID, 'TimeStamp' : timeStamp, 'Comment' : comment, 'User' : user},
                 dataType: 'json',
                 async: false
        });
        
        UpdateAnnotations();
    });
}

// Adds an annotation to the Annotation Panel
function AddAnnotationToPanel(item)
{
    var containingDiv = $('<div></div>');
    
    var deleteLink = $('<span style=\'color: grey; cursor: pointer;\'>X</span>');
    
    deleteLink.click(function () {
        
        if(!confirm("Are you sure you want to delete this annotation?")) return;
        
		var id = item['CommentID'];
        
		$.ajax({ url : 'http://testedannotations.appspot.com/',
				 type: "POST",
				 data: {'command' : 'delete', 'CommentID' : id},
				 dataType: 'json',
				 async: false
		});
		
		$('#annotePopup-' + id).HideBubblePopup();
		UpdateAnnotations();
    });
    
    var skipToAnnotation = $('<span style="cursor: pointer;"> ' + secondsToTime(item['TimeStamp'] * 1) + '</span>');
    
    skipToAnnotation.click( function () {
        SkipToTimestamp(secondsToTime(item['TimeStamp'] * 1));
    });
    
	var comment = item['Comment'];
	var linkReplace = new RegExp("\\[([\\W\\w\\s]+)\\]{(https?://[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])}", "ig");
	comment = comment.replace(linkReplace, "<a href='$2' style=\"color: white; text-decoration: underline;\" target='_blank'>$1</a>");
    
    var content = $('<div style=\'margin-left: 5px; font-weight: normal; text-overflow: ellipsis; width: 350px; display: inline-block; white-space: nowrap; overflow: hidden;\'> - ' + comment + ' </div>');
    
    var author = $('<span style=\'color:#EFF200; font-size: 12px;\'>' + item['User'] + '</span>');
    
    containingDiv.append(deleteLink);
    containingDiv.append(skipToAnnotation);
    containingDiv.append(content);
    containingDiv.append(author);
    
    $('#AnnotationList').append(containingDiv);
}

// Clears all the annotations from the podcast player and resets
// various variables to original states
function ClearAnnotations()
{
	if(updateInterval)
	{
		window.clearInterval(updateInterval);
		updateInterval = null;
	}
    
	_.each(allPopups, function(item) { item.remove() } );
	allPopups = [];
    currentlyShowing = [];
    popups = {};
    databaseJunk = [];
    
    $('#AnnotationList').empty();
}
       
// Stop showing annotations, clear all open ones, remove them from the DOM
// Update the list of annotations with a new list
// Re-apply annotations to podcast and start up the update interval again
function UpdateAnnotations()
{
	if(updateInterval)
	{
		window.clearInterval(updateInterval);
		updateInterval = null;
	}
	

	_.each(allPopups, function(item) { item.remove() } );
	allPopups = [];
    $('#AnnotationList').empty();
    
	getListOfAnnotations();
	
    databaseJunk = _.sortBy(databaseJunk, function(item) { return item['TimeStamp'] * 1; });
    
	for(var i = 0; i < databaseJunk.length; i++)
	{
		populateComment(databaseJunk[i]);
        AddAnnotationToPanel(databaseJunk[i]);
	}
	
	updateInterval = window.setInterval( function () {
		var curTimeStamp = timeToSeconds($('.time-position').text());
		var visibleComments = popups[curTimeStamp];
		
		var needToShow = _.difference(visibleComments, currentlyShowing);
		var needToHide = _.difference(currentlyShowing, visibleComments);
		
		_.each(needToHide, function(item) { 
			item.HideBubblePopup();
			var idx = currentlyShowing.indexOf(item);
			if(idx != 1) currentlyShowing.splice(idx, 1);
		});
			
		_.each(needToShow, function(item) {
			item.ShowBubblePopup();
			
			currentlyShowing.push(item);
		})
	}, 1000 );
	
	
}

// Gets a list of annotations for the podcast from the DB
function getListOfAnnotations()
{
	$.ajax({ url : 'http://testedannotations.appspot.com/',
			 type: "POST",
			 data: {'command' : 'list', 'PodcastID' : podcastID},
			 dataType: 'json',
			 async: false,
			 success: function(data) {
				databaseJunk = data;
			 }
	});
}

// Creates the popup box for a given annotation
function populateComment(item)
{

	var totalDuration = timeToSeconds($('.duration').text());
	var timeStamp = item['TimeStamp'] * 1;
	var width = (timeStamp / totalDuration) * 100;
	
	var markerContainer = $('<div></div>').css('position', 'absolute').css('height', '14px').css('width', width + "%").css('border-right', 'solid black 1px');
	var markerDiv = $('<div id="annotePopup-' + item['CommentID'] + '"></div>').css('position', 'absolute').css('height', '14px').css('width', "1px").css('border-right', 'solid black 1px').css('right', '-1px');
	$('.buffer').append( markerContainer );
	markerContainer.append(markerDiv);
	
	var comment = item['Comment'];
	var linkReplace = new RegExp("\\[([\\W\\w\\s]+)\\]{(https?://[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])}", "ig");
	comment = comment.replace(linkReplace, "<a href='$2' target='_blank'>$1</a>");

	var inHtml = 	'<div style="min-height: 50px; min-width: 200px; color: #666;">' + 
						'<div style="height: 14px; width: 100%; position: relative; padding-bottom: 8px;">' +
							'<div style="font-wight: bold; position: absolute; left: 0px;"><span style="color: black;">' + item['User'] + '</span> said:</div>' +
							'<div class="annotDeleteButton" style="position:absolute; right: 0px; cursor: pointer; color: black;" data-annote-id="' + item['CommentID'] + '" >Delete</div>' + // TODO: Turn this into a download link
						'</div>' +
						'<div>' + comment + '</div>' +
					'</div>'
		
	var pos = 'top';
	
	if(timeStamp < 1800)
	{
		pos = 'bottom';
	}
	
	
	markerDiv.CreateBubblePopup({
		position: pos,
		align: 'center',
		innerHtml: inHtml,
		manageMouseEvents: false,
		themeName: 'black',
		themePath:	chrome.extension.getURL("jquerybubblepopup-themes")
	});
	
	// Used to set how long the popup lasts for
	//e.g 0 and 5 means that it shows at timestamp + 0 to timestamp + 5
	var startDuration = 0;
	var duration = 5;
	
	for(var i = startDuration; i < duration + 1; i++)
	{
		if(!popups[timeStamp + i]) popups[timeStamp + i] = []
		popups[timeStamp + i].push(markerDiv);
	}
	
	allPopups.push(markerContainer);
}