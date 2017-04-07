/* jshint strict: false */
/* global $: false, google: false */
//
// Red, White, and Blue JavaScript 
// for EECS 339 Project A at Northwestern University
//
// Originally by Peter Dinda
// Sanitized and improved by Ben Rothman
//
//
// Global state
//
// html    - the document itself ($. or $(document).)
// map     - the map object
// usermark- marks the user's position on the map
// markers - list of markers on the current map (not including the user position)
//
//

//
// When the document has finished loading, the browser
// will invoke the function supplied here.  This
// is an anonymous function that simply requests that the 
// brower determine the current position, and when it's
// done, call the "Start" function  (which is at the end
// of this file)
// 
//
$(document).ready(function() {
	navigator.geolocation.getCurrentPosition(Start);
//	attachCheckBoxHandler();
//	checkCheckbox();
//	checkCycles();
	//FindMe();
	console.log("START");
});

// Global variables
var map, usermark, markers = [],

// UpdateMapById draws markers of a given category (id)
// onto the map using the data for that id stashed within 
// the document.
// 
UpdateMapById = function(id, tag) {
// the document division that contains our data is #committees 
// if id=committees, and so on..
// We previously placed the data into that division as a string where
// each line is a separate data item (e.g., a committee) and
// tabs within a line separate fields (e.g., committee name, committee id, etc)
// 
//
// first, we slice the string into an array of strings, one per 
// line / data item
	var rows  = $("#"+id).html().split("\n");
//	console.log("F");
//	console.log(rows);
// then, for each line / data item
	for (var i=0; i<rows.length; i++) {
// we slice it into tab-delimited chunks (the fields)
		var cols = rows[i].split("\t"),
// grab specific fields like lat and long
			lat = cols[0],
			long = cols[1];

// then add them to the map.   Here the "new google.maps.Marker"
// creates the marker and adds it to the map at the lat/long position
// and "markers.push" adds it to our list of markers so we can
// delete it later 
		markers.push(new google.maps.Marker({
			map: map,
			position: new google.maps.LatLng(lat,long),
			title: tag+"\n"+cols.join("\n")
		}));

	}
},

//
// ClearMarkers just removes the existing data markers from
// the map and from the list of markers.
//
ClearMarkers = function() {
	// clear the markers
	while (markers.length>0) {
		markers.pop().setMap(null);
	}
},

//
// UpdateMap takes data sitting in the hidden data division of 
// the document and it draws it appropriately on the map
//
UpdateMap = function() {
// We're consuming the data, so we'll reset the "color"
// division to white and to indicate that we are updating
	var color = $("#color");
	color.css("background-color", "white")
		.html("<b><blink>Updating Display...</blink></b>");

// Remove any existing data markers from the map
	ClearMarkers();

// Then we'll draw any new markers onto the map, by category
// Note that there additional categories here that are 
// commented out...  Those might help with the project...
//
	UpdateMapById("committee_data","COMMITTEE");
	UpdateMapById("candidate_data","CANDIDATE");
	UpdateMapById("individual_data", "INDIVIDUAL");
	UpdateMapById("opinion_data","OPINION");

// When we're done with the map update, we mark the color division as
// Ready.
	color.html("Ready");

// The hand-out code doesn't actually set the color according to the data
// (that's the student's job), so we'll just assign it a random color for now
	if (Math.random()>0.5) {
		color.css("background-color", "blue");
	} else {
		color.css("background-color", "red");
	}

},

//
// NewData is called by the browser after any request
// for data we have initiated completes
//
NewData = function(data) {
// All it does is copy the data that came back from the server
// into the data division of the document.   This is a hidden 
// division we use to cache it locally
	$("#data").html(data);
	console.log("======");
	console.log(data);
// Now that the new data is in the document, we use it to
// update the map
	UpdateMap();
	ColorTransDiv();
	ColorOpinions();
},

ColorTransDiv = function(){
	//var diff = document.getElementById("diff").innerHTML;
	var demtrans_cand = document.getElementById("dem_trans_amnt").innerHTML;
	var reptrans_cand = document.getElementById("rep_trans_amnt").innerHTML;
	var demtrans_comm = document.getElementById("dem_comm_trans_amnt").innerHTML;	
	var reptrans_comm = document.getElementById("rep_comm_trans_amnt").innerHTML;

	if (isNaN(demtrans_cand)) { demtrans_cand = 0;}
	if (isNaN(reptrans_cand)) { reptrans_cand = 0;}
	if (isNaN(demtrans_comm)) { demtrans_comm = 0;}
	if (isNaN(reptrans_comm)) { reptrans_comm = 0;}
	var demtrans_tot = Number(demtrans_cand) + Number(demtrans_comm);
	var reptrans_tot = Number(reptrans_comm) + Number(reptrans_cand);
	var totaltrans = demtrans_tot + reptrans_tot;
	var scalar = Math.abs(demtrans_comm + demtrans_cand - reptrans_cand - reptrans_comm)/totaltrans;


	var red = 0; var green = 0; var blue = 0;

	if (demtrans_tot > reptrans_tot) {blue = 255*scalar;}
	if (reptrans_tot > demtrans_tot) {red = 255*scalar;}

	var el = document.getElementById("comm_trans_amnt");
	el.style.backgroundColor = "rgb("+ red + "," + green + "," + blue + ")";
	console.log("Color Div..");

},


ColorOpinions = function(){
	var opinions_data = document.getElementById("opinions_data".innerHTML;
	var vals = opinions_data.split(" ");
	var avg = Number(vals[0])
	
	var red = 0; var green = 0; var blue = 0;
	if (avg > 0) { blue = 255*scalar;}
	if (avg < 0 ) { red = 255*Math.abs(avg);}

	opinions_data.style.backgroundColor = "rgb(" + red + "," + green + "," + blue + ")";
	

},

//
// The Google Map calls us back at ViewShift when some aspect
// of the map changes (for example its bounds, zoom, etc)
//
ViewShift = function() {
// We determine the new bounds of the map
	var bounds = map.getBounds(),
		ne = bounds.getNorthEast(),
		sw = bounds.getSouthWest();

// Now we need to update our data based on those bounds
// first step is to mark the color division as white and to say "Querying"
	$("#color").css("background-color","white")
		.html("<b><blink>Querying...("+ne.lat()+","+ne.lng()+") to ("+sw.lat()+","+sw.lng()+")</blink></b>");

// Check for checkboxes
	var checked = checkCheckbox();
	var checked_years = checkCycles();
// Now we make a web request.   Here we are invoking rwb.pl on the 
// server, passing it the act, latne, etc, parameters for the current
// map info, requested data, etc.
// the browser will also automatically send back the cookie so we keep
// any authentication state
// 
// This *initiates* the request back to the server.  When it is done,
// the browser will call us back at the function NewData (given above)
	$.get("rwb.pl",
		{
			act:	"near",
			latne:	ne.lat(),
			longne:	ne.lng(),
			latsw:	sw.lat(),
			longsw:	sw.lng(),
			format:	"raw",
			cycle: checked_years.join(','),
			what:	checked.join(',')
		}, NewData);
},

printStuff = function(){
	console.log("hello");
},




checkCheckbox = function(){
	var checkboxes_div = document.getElementById('data_filter');
	var checkboxes = checkboxes_div.getElementsByTagName('input');
	var checked = [];
	console.log(checkboxes.length);
	for (var i = 0; i < checkboxes.length; i++){
		if (checkboxes[i].checked === true){
			console.log(checkboxes[i].value);
			checked.push(checkboxes[i].value);
		}
	}
	console.log(checked);
	return checked;
},

checkCycles = function(){

	var cycles_form = document.getElementById('allCycles');
	var cycles_checkbox_array = cycles_form.getElementsByTagName('input');
	var checked = [];
//	console.log(cycles_checkbox_array.length);
	for (var i = 0; i < cycles_checkbox_array.length; i++){
		if (cycles_checkbox_array[i].checked === true){
//			console.log(cycles_checkbox_array[i].value);
			checked.push(cycles_checkbox_array[i].value);
		}
	}	

	console.log(checked);
	return checked;

},
//
// If the browser determines the current location has changed, it 
// will call us back via this function, giving us the new location
//
Reposition = function(pos) {
// We parse the new location into latitude and longitude
	var lat = pos.coords.latitude,
		long = pos.coords.longitude;

// ... and scroll the map to be centered at that position
// this should trigger the map to call us back at ViewShift()
	map.setCenter(new google.maps.LatLng(lat,long));
// ... and set our user's marker on the map to the new position
	usermark.setPosition(new google.maps.LatLng(lat,long));
},
/*
FindMe = function() {
	var output = document.getElementById("out");


	function success(position){
		var lat = position.coords.latitude;
		var long = position.coords.longitude;

		$.get("rwb.pl",
			{
				act: "getloc",
				latitude: lat,
				longitude: long	
			}, printStuff

		);

		console.log(lat + " " + long + "... ");
	}

	navigator.geolocation.getCurrentPosition(success);
},

*/

//
// The start function is called back once the document has 
// been loaded and the browser has determined the current location
//
Start = function(location) {
// Parse the current location into latitude and longitude        
	var lat = location.coords.latitude,
	    long = location.coords.longitude,
	    acc = location.coords.accuracy,
// Get a pointer to the "map" division of the document
// We will put a google map into that division
	    mapc = $("#map");
console.log(lat);
console.log(long);
// Create a new google map centered at the current location
// and place it into the map division of the document
	map = new google.maps.Map(mapc[0],
		{
			zoom: 16,
			center: new google.maps.LatLng(lat,long),
			mapTypeId: google.maps.MapTypeId.HYBRID
		});

// create a marker for the user's location and place it on the map
	usermark = new google.maps.Marker({ map:map,
		position: new google.maps.LatLng(lat,long),
		title: "You are here"});

// clear list of markers we added to map (none yet)
// these markers are committees, candidates, etc
	markers = [];

// set the color for "color" division of the document to white
// And change it to read "waiting for first position"
	$("#color").css("background-color", "white")
		.html("<b><blink>Waiting for first position</blink></b>");

//
// These lines register callbacks.   If the user scrolls the map, 
// zooms the map, etc, then our function "ViewShift" (defined above
// will be called after the map is redrawn
//
	google.maps.event.addListener(map,"bounds_changed",ViewShift);
	google.maps.event.addListener(map,"center_changed",ViewShift);
	google.maps.event.addListener(map,"zoom_changed",ViewShift);

//
// Finally, tell the browser that if the current location changes, it
// should call back to our "Reposition" function (defined above)
//
	navigator.geolocation.watchPosition(Reposition);
};
