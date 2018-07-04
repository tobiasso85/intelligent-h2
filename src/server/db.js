/**
 *
 *  Date to request URL
 *  Date to URL
 *
 *  _________________________________________________________
 * /            date            |              request url   \
 * |____________________________|____________________________|
 * |                            |                            |
 * |    1529074838836           |    path/myfile.js          |
 * |____________________________|____________________________|
 *
 *
 * Analyze table
 * URL to URL[]
 *
 *
 *  ________________________________________________________________
 * /            url             |              related url          \
 * |____________________________|___________________________________|
 * |                            |                                   |
 * |    path/myfile.js          | path/myfile1.js, path/myfile2.js  |
 * |____________________________|___________________________________|
 *
 *
 *
 */

var JsonDB = require('node-json-db');

var dbRequestMapping = new JsonDB(__dirname + "/db/requestMapping", true, false);
var dbAnalysis = new JsonDB(__dirname + "/db/analysis", true, false);

var getUrlKey = function(sURL) {
	if (sURL) {
		return getKey(encodeURIComponent(sURL));
	}
	return getKey("");
};

var getKey = function(sString = "") {
	return "/" + sString;
};

const MAX_RELATED_REQUESTS = 5;

module.exports = {

	clear: function() {
		dbRequestMapping.delete(getKey(""));
		dbAnalysis.delete(getKey(""));
	},

	storeRequest: function(req) {
		dbRequestMapping.push(getKey(Date.now()), {url: req.url});
	},
	storeRequestAnalysis: function(req) {

		//find all requests which match the url
		var oAllData = dbRequestMapping.getData(getKey(""));
		var aTimestamps = Object.keys(oAllData);
		var aRelatedTimestamps = aTimestamps.filter(function(sTimeStamp) {
			return oAllData[sTimeStamp].url === req.url;
		});

		aRelatedTimestamps.sort(function(a, b) {
			return parseInt(a) > parseInt(b) ? 1 : -1;
		});


		// mapping between diff time to request and request url
		var mPossibleRequests = {};
		// find closest requests
		aRelatedTimestamps.forEach(function(sRelatedTimeStamp, iIndex) {
			var iRelatedTimestamp = parseInt(sRelatedTimeStamp);


			var aPossibleTimestamps = aTimestamps.filter(function(sTimeStamp) {
				var iTimestamp = parseInt(sTimeStamp);
				var bInRange = iTimestamp > iRelatedTimestamp && iTimestamp < iRelatedTimestamp + 1000;
				if (aRelatedTimestamps[iIndex + 1]) {
					bInRange = bInRange && iTimestamp < aRelatedTimestamps[iIndex + 1];
				}
				return bInRange;
			});

			aPossibleTimestamps.forEach(function(oPossibleTimestamp) {
				mPossibleRequests[parseInt(oPossibleTimestamp) - iRelatedTimestamp] = oAllData[oPossibleTimestamp];
			});

		});

		var aTimeStampsSorted = Object.keys(mPossibleRequests).sort();

		var aRelatedRequests = [];
		for (let i = 0; i < Math.min(MAX_RELATED_REQUESTS, aTimeStampsSorted.length); i++) {
			aRelatedRequests.push(mPossibleRequests[aTimeStampsSorted[i]].url);
		}

		aRelatedRequests = Array.from(new Set(aRelatedRequests)).filter(function(sRequest) {
			return sRequest !== req.url;
		});


		console.log("related: " + aRelatedRequests.join(", "));
		dbAnalysis.push(getUrlKey(req.url), aRelatedRequests);

	},
	getRequestAnalysis: function(req) {
		let aResult = dbAnalysis.getData(getUrlKey(req.url));
		if (Object.keys(aResult).length === 0) {
			return [];
		}
		return aResult;
	}
};