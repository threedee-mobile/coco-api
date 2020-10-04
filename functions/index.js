const firebaseFunctions = require('firebase-functions');
const express = require('express');
const firebaseAdmin = require('firebase-admin');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const common = require('./common');
const regions = require('./regions');
const auth = require('./auth');

firebaseAdmin.initializeApp();

const apiV1 = express();

apiV1.use(bodyParser.urlencoded({ extended: true }));

var EARTH_RADIUS_KM = 6371.0;

var MAX_YEAR = 2018;
var MIN_YEAR = 2016;
var MAX_LAT = 90.0;
var MIN_LAT = -90.0;
var MAX_LON = -180;
var MIN_LON = 180;
var MAX_RADIUS_KM = 100;
var MIN_RADIUS_KM = 10;

var supportedYears = ["2015", "2016", "2017", "2018", "2018"];
var supportedMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "november", "december"];

function distanceBetween(lat1, lon1, lat2, lon2) {
  var rLat = deg2rad(lat2-lat1);
  var rLon = deg2rad(lon2-lon1); 

  var a =  Math.sin(rLat/2.0) * Math.sin(rLat/2.0) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(rLon/2.0) * Math.sin(rLon/2.0);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 

  var d = EARTH_RADIUS_KM * c;

 	console.log('QUERY', "distance: " + d);

  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180.0)
}

apiV1.get('/data', (request, response) => {
	console.log('QUERY', (typeof request.query.month) + " -> " + supportedMonths.includes(request.query.month));

	// VERIFY API KEY
	var apiKey = request.header(auth.headerApiKey);
	if (!auth.isApiKeyValid(apiKey)) {
		common.sendError(response, 401, "401.001", "Unauthorized or missing api-key. Please contact threedee.mobile@gmail.com to obtain an API key");
	} else {
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
			common.sendError(response, 400, "400.001", "Invalid query: year (int) is required and must be " + MIN_YEAR + " <= year <= " + MAX_YEAR);
			return;
		}

		if (typeof request.query.month !== "undefined" && supportedMonths.includes(request.query.month)) {
			monthParam = request.query.month;
		} else {
			isQueryValid = false;
			common.sendError(response, 400, "400.002", "Invalid query: month (str) is required and must be the proper name, all lowercase");
			return;
		}

		if (typeof request.query.radius !== "undefined") {
			var r = Math.floor(request.query.radius)
			if (r >= MIN_RADIUS_KM && r <= MAX_RADIUS_KM) {
				radiusParam = r;
			} else {
				isQueryValid = false;
				common.sendError(response, 400, "400.003", "Invalid query: radius (km) is optional and must be " + MIN_RADIUS_KM + " <= radius <= " + MAX_RADIUS_KM);
			}
		}

		if (typeof request.query.latitude !== "undefined" && request.query.latitude >= MIN_LAT && request.query.latitude <= MAX_LAT) {
			latParam = request.query.latitude;
		} else {
			isQueryValid = false;
			common.sendError(response, 400, "400.004", "Invalid query: latitude (degrees) is required and must be " + MIN_LAT + " <= latitude <= " + MAX_LAT);
		}

		if (typeof request.query.longitude !== "undefined" && request.query.longitude >= MIN_LAT && request.query.longitude <= MAX_LAT) {
			lonParam = request.query.longitude;
		} else {
			isQueryValid = false;
			common.sendError(response, 400, "400.005", "Invalid query: longitude (degrees) is required must be " + MIN_LAT + " <= longitude <= " + MAX_LAT);
		}
		

		if (!regions.isSupportedRegion(latParam, lonParam)) {
				isQueryValid = false;
				common.sendError(response, 422, "422.001", "The provided latitude and longitude does not fall within a supported region");
		}

		if (isQueryValid) {
			// FILTER DATA
		  firebaseAdmin.database().ref("data")
			.once("value", function(snapshot1) {
				var data = snapshot1.val();

				var result = {
					"data": []
				};

				try {
					var cells = [];
					data.forEach((item) => {
						var year = item.year;
						if (yearParam === year) {
							item.monthlyData.forEach((monthItem) => {
								var month = monthItem.month;
								if (monthParam === month) {
									monthItem.cells.forEach((cell) => {
										if (radiusParam > distanceBetween(latParam, lonParam, cell.lat, cell.lon)) {
											cells.push(cell);
										}
									});
								}
							});
						}
					});

					result.data = cells;

				} catch(error) {
					console.log('ERROR', "Error occurred: " + error);
					common.sendError(response, 500, "500.001", "Internal error")
				}
			
				common.sendSuccess(response, result);
			}, 
			function (error) {
					common.sendError(response, 500, "500.002", "Internal connection error")
		  });
		}
	}
});

apiV1.get('/generateApiKey', (request, response) => {
	var result = {
		"key": common.uuid()
	}
	common.sendSuccess(response, result);
});

apiV1.get('/encryptApiKey', (request, response) => {
	var apiKey = request.header(auth.headerApiKey);

	if (typeof apiKey === "undefined") {
		common.sendError(response, 401, "401.001", "Invalid api-key")
	} else {
		var cipherKey = crypto.createCipher('aes-128-cbc', auth.apiKeyPwd);
		var encryptedKey = cipherKey.update(auth.apiKeyPrefix + "." + apiKey, 'utf8', 'hex');
		encryptedKey += cipherKey.final('hex');

		var result = {
			"key": encryptedKey
		}

		common.sendSuccess(response, result);
	}
});

const v1 = firebaseFunctions
	.runWith({ memory: '1GB', timeoutSeconds: 30 })
	.https
	.onRequest(apiV1);

module.exports = {
	v1
}
