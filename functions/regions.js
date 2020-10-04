const express = require('express');
const bodyParser = require('body-parser');

var availableRegions = {
    "ca": {
        "minLat": 42,
        "maxLat": 83,
        "minLon": -141,
        "maxLon": -53
    },
    "usa": {
        "minLat": 18,
        "maxLat": 49,
        "minLon": -125,
        "maxLon": -62
    }
}

function isSupportedRegion(lat, lon) {
	var supported = true;
	for (var region in availableRegions) {
        var minLat = availableRegions[region].minLat;
        var maxLat = availableRegions[region].maxLat;
        var minLon = availableRegions[region].minLon;
        var maxLon = availableRegions[region].maxLon;
        if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
			supported = false;
            break;
		}
	}
	return supported;
}

module.exports = {
    isSupportedRegion: isSupportedRegion
}
