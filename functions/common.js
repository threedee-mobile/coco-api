const express = require('express');
const firebaseAdmin = require('firebase-admin');
const bodyParser = require('body-parser');

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

/**
	Random UUID generator based on RFC 4122, section 4.4: https://www.ietf.org/rfc/rfc4122.txt
**/
function uuid() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}

module.exports = {
    sendSuccess: sendSuccess,
    sendError: sendError,
    uuid: uuid
}
