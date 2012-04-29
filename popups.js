
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

var podcastID = '0'; // ID of podcast
var updateInterval = null; // Used to keep track of the update interval function

// Gets the podcast ID, sets up the Add Annotation button
// registeres the delete button event for annotations, and then updates the annotations 
$(document).ready(function () {

	podcastID = $('.podcast-player .info .title').text().split(' ')[1];

	AddAnnotationButton();

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
	allPopups =[]
	getListOfAnnotations();
	
	for(var i = 0; i < databaseJunk.length; i++)
	{
		populateComment(databaseJunk[i]);
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

// Create the add annotation dialog
function AddAnnotationButton()
{

	var addAnnotation = $('<span style="color:white; position: absolute; right: 5px; bottom: 3px; cursor: pointer;">Add Annotation</span>');
	$('.player').append(addAnnotation);
	
	addAnnotation.CreateBubblePopup({
		position: 'top',
		align: 'center',
		innerHtml: "",
		manageMouseEvents: false,
		themeName: 'black',
		themePath:	chrome.extension.getURL("jquerybubblepopup-themes")
	});
	
	addAnnotation.click( function() {
	
		var timeStamp = $('.time-position').text();
		var inHtml = '<div style="min-height: 100px; min-width: 200px">' + 
						'<div style="height: 14px; width: 100%; position: relative; padding-bottom: 8px;">' +
							'<div style="font-wight: bold; position: absolute; left: 0px;">Add Annotation</div>' +
							'<div id="closeAnnotationButton" style="position:absolute; right: 0px; cursor: pointer;">Close</div>' +
						'</div>' +
						'<div style="margin-bottom: 15px"><table> <tr> <td style="padding-right: 3px;">  Timestamp: </td><td><span id="AddAnnotationTimeStamp">' + timeStamp + '</span></td></tr>' +
						'<tr> <td style="vertical-align: top;">Comment:</td><td> <textarea id="AddAnotationTextArea"></textarea> </td><tr></table></div>' +
						'<div id="AddAnnotationButton" style="border: 1px solid black; padding: 2px; width: 80px; cursor: pointer;">Add Annotation</div>' +
					'</div>'
			
		addAnnotation.ShowBubblePopup({
				position: 'top',
				align: 'center',
				
				manageMouseEvents: false,
				themeName: 'black',
				themePath:	chrome.extension.getURL("jquerybubblepopup-themes"),
				innerHtml: inHtml
			});
			
		$('#closeAnnotationButton').click( function () {
		
			addAnnotation.HideBubblePopup();
		});
		
		
		$('#AddAnnotationButton').click( function() {
			var user = $('.user-auth').find('span').text().split(' ')[1].replace(/\./g, ''); // Replace with user name
			var comment = $('#AddAnotationTextArea').val();
			var timeStamp = timeToSeconds($('#AddAnnotationTimeStamp').text());
			
			$.ajax({ url : 'http://testedannotations.appspot.com/',
					 type: "POST",
					 data: {'command' : 'add', 'PodcastID' : podcastID, 'TimeStamp' : timeStamp, 'Comment' : comment, 'User' : user},
					 dataType: 'json',
					 async: false
			});
			
			addAnnotation.HideBubblePopup();
			UpdateAnnotations();
		});
	});
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
	var linkReplace = new RegExp("\\[([\\w\\s]+)\\]{(https?://[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])}", "ig");
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