const firebaseFunctions = require('firebase-functions');
const express = require('express');
const firebaseAdmin = require('firebase-admin');
const bodyParser = require('body-parser');
const crypto = require('crypto');

firebaseAdmin.initializeApp();

const apiV1 = express();

apiV1.use(bodyParser.urlencoded({ extended: true }));

var EARTH_RADIUS_KM = 6371;
var MAX_LAT = 90.0;
var MIN_LAT = -90.0;
var MAX_LON = -180;
var MIN_LON = 180;
var MAX_RADIUS_KM = 100;
var MIN_RADIUS_KM = 5;
var supportedYears = ["2018", "2019"];
var supportedMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "november", "december"];

function sendSuccess(response, responseJson) {
	console.log('SUCCESS', "\n\n" + responseJson + "\n\n");
	response.status(200).send(responseJson)
}

function sendError(response, status, code, message) {
	var responseJson = {
		"code": code,
		"message": message
	}
	console.log('ERROR', "\n\n" + message + "\n\n");
	response.status(status).send(responseJson)
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  var rLat = deg2rad(lat2-lat1);
  var rLon = deg2rad(lon2-lon1); 

  var a =  Math.sin(rLat/2) * Math.sin(rLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(rLon/2) * Math.sin(rLon/2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 

  var d = EARTH_RADIUS_KM * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

apiV1.get('/data', (request, response) => {
	console.log('QUERY', (typeof request.query.month) + " -> " + supportedMonths.includes(request.query.month));

	// QUERY PARAMETERS
	var yearParam = -1;
	var monthParam = "";
	var latParam = Number.MIN_SAFE_INTEGER;
	var lonParam = Number.MIN_SAFE_INTEGER;
	var radiusParam = MAX_RADIUS_KM;

	var isQueryValid = true;

	for (const key in request.query) {
	  console.log("QUERY param: " + key, request.query[key])
	}

	if (typeof request.query.year !== "undefined" && supportedYears.includes(request.query.year)) {
		yearParam = parseInt(request.query.year);
	} else {
		isQueryValid = false;
		sendError(response, 400, "400.001", "Invalid query: year (int) is required and must be 2018 <= year <= 2019")
		return;
	}

	if (typeof request.query.month !== "undefined" && supportedMonths.includes(request.query.month)) {
		monthParam = request.query.month;
	} else {
		isQueryValid = false;
		sendError(response, 400, "400.002", "Invalid query: month (str) is required and must be full name, all lowercase")
		return;
	}

	if (typeof request.query.radius !== "undefined") {
		var r = Math.floor(request.query.radius)
		if (r >= MIN_RADIUS_KM && r <= MAX_RADIUS_KM) {
			radiusParam = r;
		} else {
			isQueryValid = false;
			sendError(response, 400, "400.003", "Invalid query: radius (km) is optional and must be " + MIN_RADIUS_KM + " <= radius <= " + MAX_RADIUS_KM)
		}
	}

	if (typeof request.query.latitude !== "undefined") {
		if (request.query.latitude >= MIN_LAT && request.query.latitude <= MAX_LAT) {
			latParam = request.query.latitude;
		} else {
			isQueryValid = false;
			sendError(response, 400, "400.004", "Invalid query: latitude (degrees) must be " + MIN_LAT + " <= radius <= " + MAX_LAT)
		}
	}

	if (typeof request.query.longitude !== "undefined") {
		if (request.query.longitude >= MIN_LAT && request.query.longitude <= MAX_LAT) {
			lonParam = request.query.longitude;
		} else {
			isQueryValid = false;
			sendError(response, 400, "400.005", "Invalid query: longitude (degrees) must be " + MIN_LAT + " <= radius <= " + MAX_LAT)
		}
	}

	if (lonParam !== Number.MIN_SAFE_INTEGER && latParam === Number.MIN_SAFE_INTEGER) {
			isQueryValid = false;
			sendError(response, 400, "400.006", "Invalid query: latitude is required if longitude is provided")
	}

	if (latParam !== Number.MIN_SAFE_INTEGER && lonParam === Number.MIN_SAFE_INTEGER) {
			isQueryValid = false;
			sendError(response, 400, "400.007", "Invalid query: longitude is required if latitude is provided")
	}

	if (isQueryValid) {
		// FILTER DATA
	  firebaseAdmin.database().ref("data")
		.once("value", function(snapshot1) {
			var data = snapshot1.val();

			var result = {};
			var foundMatch = false;

			data.forEach((item) => {
				var year = item.year;
				if (!foundMatch && yearParam === year) {
						item.monthlyData.forEach((monthItem) => {
							var month = monthItem.month;
							if (monthParam === month) {
									foundMatch = true;
									if (latParam === -1 && lonParam === -1) {
										// no lat/lon provided, return all cells for this month/year
										result = {
											"data": monthItem.cells
										};
									} else {
										// only return the nearby cells
										var cells = [];
										monthItem.cells.forEach((cell) => {
											if (radiusParam > distanceBetween(latParam, lonParam, cell.lat, cell.lon)) {
												cells.push(cell);
											}
										});

										result = {
											"data": cells
										};
									}							  
							}
						});
				}
			});

			sendSuccess(response, result);
		}, 
		function (error) {
				sendError(response, 500, "500.001", "Internal connection error")
	  });
	}
});

const v1 = firebaseFunctions.https.onRequest(apiV1);

module.exports = {
	v1
}
