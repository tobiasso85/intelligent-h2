#!/usr/bin/env node
const argv = require('yargs').argv;
const debug = require('debug')('launcher');


var sFolder = argv.folder || __dirname + "/../public";
var bPush = argv.push === undefined || argv.push === "true";
var sAnalyze = argv.analyze || "clean";
var iPort = argv.port || 3000;

debug("loading resources from: " + sFolder);
debug("push: " + bPush);

const spdy = require('spdy');
const fs = require('fs');
const db = require('./db');


if (sAnalyze === "clean") {
	debug("starting with clean db");
	db.clear();
}

// created with: cd cert && openssl req -new -newkey rsa:2048 -sha256 -days 365 -nodes -x509 -keyout cert.key -out cert.crt
//hostname
var options = {
	key: fs.readFileSync(__dirname + '/../../cert/cert.key'),
	cert: fs.readFileSync(__dirname + '/../../cert/cert.crt')
};

/**
 * push file descriptor
 * @param sFile
 * @param res
 */
function push(sFile, res) {
	if (!bPush) {
		debug("Push is deactivated " + sFile);
		return;
	}
	if (!res.push) {
		debug("cannot push!!! for " + sFile);
		return;
	}
	var oFile = getFileFromUrl(sFile);
	if (!oFile) {
		debug("File " + sFile + " not found");
		return;
	}
	debug("PUSHIN: " + sFile);
	var oObject = {
		status: 200, // optional
		method: 'GET', // optional
		request: {
			accept: '*/*'
		}
	};
	oObject.response = {};
	if (sFile.endsWith(".js")) {
		oObject.response['content-type'] = 'application/javascript';
	} else if (sFile.endsWith(".css")) {
		oObject.response['content-type'] = 'text/css';
	} else if (sFile.endsWith(".html")) {
		oObject.response['content-type'] = 'text/html';
	}

	var stream = res.push(sFile, oObject);
	stream.on('error', function(e) {
		debug("error " + e);
	});
	//file content
	stream.end(oFile);
}

const mUrlToFileName = {};

function getFileFromUrl(sFile) {
	var oFile = mUrlToFileName[sFile];
	if (oFile) {
		return oFile;
	}
	try {
		oFile = fs.readFileSync(sFolder + sFile);
	} catch (e) {
		debug(e);
		return false;
	}
	mUrlToFileName[sFile] = oFile;
	return oFile;
}

function findRelatedFiles(req) {
	// checks the analyze db and finds related files from related request
	var aRelatedRequests = db.getRequestAnalysis(req);
	return aRelatedRequests.map(function(oReq) {
		return oReq;
	});
}

function storeRequest(req) {
	db.storeRequest(req);
	//write request to the database with the date
}

function analyzeData(req) {
	db.storeRequestAnalysis(req);
	// find request related data and store it in db such that it can be easily consumed to find related requests --> findRelatedFiles
}

spdy.createServer(options, function(req, res) {
	var oRequest = {
		url: req.url
	};
	if (oRequest.url === '/') {
		oRequest.url = "/home.html";
	}
	debug("requesting url: " + oRequest.url);


	//analyze and store are triggered async
	// request url
	//according to request url what should be pushed
	var oPromise = new Promise(function(resolve) {
		storeRequest(oRequest);
		analyzeData(oRequest);
		resolve();
	}).then(function() {
		debug("save complete");
	});
	Promise.resolve(oPromise);

	var aFindRelatedFiles = findRelatedFiles(oRequest);
	debug(aFindRelatedFiles.length + " for " + oRequest.url);
	aFindRelatedFiles.forEach(function(oFile) {
		push(oFile, res);
	}.bind(res));

	debug("serving file: " + oRequest.url);
	let oFile = getFileFromUrl(oRequest.url);
	if (!oFile) {
		res.writeHead(404);
		res.end("file not found");
	} else {
		res.writeHead(200);
		res.end(oFile)
	}

}).listen(iPort);

debug("server started on port " + iPort);