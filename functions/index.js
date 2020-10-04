const firebaseFunctions = require('firebase-functions');
const express = require('express');
const firebaseAdmin = require('firebase-admin');
const bodyParser = require('body-parser');
const crypto = require('crypto');

firebaseAdmin.initializeApp();

const apiV1 = express();

apiV1.use(bodyParser.urlencoded({ extended: true }));

var supportedYears = ["2018", "2019"]
var supportedMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "november", "december"]

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

apiV1.get('/data', (request, response) => {
	console.log('QUERY', (typeof request.query.month) + " -> " + supportedMonths.includes(request.query.month));

	// QUERY PARAMETERS
	var yearParam = -1;
	var monthParam = "";

	for (const key in request.query) {
	  console.log("QUERY param: " + key, request.query[key])
	}

	var queryYear = request.query.year;
	if (typeof queryYear !== "undefined" && supportedYears.includes(queryYear)) {
		yearParam = parseInt(queryYear);
	} else {
		sendError(response, 400, "400.001", "Invalid query: year must be 2018 <= year <= 2019")
		return;
	}

	var queryMonth = request.query.month;
	if (typeof queryMonth !== "undefined" && supportedMonths.includes(queryMonth)) {
		monthParam = queryMonth;
	} else {
		sendError(response, 400, "400.001", "Invalid query: month must be full name, all lowercase")
		return;
	}

	if (yearParam !== -1 && monthParam !== "") {
		// FILTER DATA
	  firebaseAdmin.database().ref("data")
		.once("value", function(snapshot1) {
			var data = snapshot1.val();

			var result = "No results"

			data.forEach((item) => {
				var year = item.year;
				if (yearParam === year) {
						item.monthlyData.forEach((monthItem) => {
							var month = monthItem.month;
							if (monthParam === month) {
									var cells = monthItem.cells;
								  result = {
								  	"data": cells
								  };
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
