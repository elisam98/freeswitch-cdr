
/**
 * Module dependencies.
 */

var express = require('express');
var cors = require('cors');
var routes = require('./routes');
var http = require('http');
var path = require('path');

require('dotenv').config();

// Load the Cloudant library.
var Cloudant = require('cloudant');
var me = process.env.CLOUDANT_ACCOUNT;
var password = process.env.CLOUDANT_PASSWORD;

var cloudant = Cloudant({account:me, password:password});

var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
if (typeof ipaddress === "undefined") {
	console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
	ipaddress = "127.0.0.1";
};

var app = express();

// all environments
app.set('port', port);
app.set('domain', ipaddress);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.options('*', cors());

// development only

if ('development' == app.get('env')) {
	app.use(express.errorHandler());
};

app.get('/', routes.index);

app.get('/api', function(req, res) {
	cloudant.db.list(function(err, allDbs) {
		res.send('Available databases: ' + allDbs.join(', '));
	    });
});
app.get('/api/cdrs', cors(), function(req, res) {
	var limit = parseInt(req.query.limit) || undefined;
	var skip = parseInt(req.query.skip) || 0;
	var sort = req.query.sort || 'desc';
	var epochStart = req.query.start ? req.query.start : 0;
	var epochEnd = req.query.end || Date.now().toString();


	var andArray = [];
	andArray.push({"variables.start_uepoch": {"$gte": epochStart}});

	if(typeof req.query.context != 'undefined') {
		if(req.query.context != 'all') {
			andArray.push({"callflow": { "$elemMatch": { "caller_profile.context": req.query.context}}});
		}
	}
	if(typeof req.query.end != 'undefined') {
		andArray.push({"variables.start_uepoch": {"$lte": req.query.end}});
	}
	console.log(andArray);

	var cdr = cloudant.use('safetelecom_cdr');
	var query = {
		"selector": {
			"$and": andArray
		},
		"sort": [{"variables.start_uepoch": sort}],
		"limit": limit,
		"skip": skip
	};
	console.log(query);
	cdr.find(query, function(err, docs) {
		var billsec = 0;
/*
		if (typeof context != 'undefined') {
			var results = [];

			docs.docs.forEach(function(value) {
				if (value.callflow[0].caller_profile.context == context) {
					results.push(value);
				};
			});

			docs.docs = results;
		}
*/
		docs.docs.forEach(function(value) {
			billsec += parseInt(value.variables.billsec);
		});

        var result = {"meta": {"length":docs.docs.length,"sort":sort,"limit":limit,"skip":skip,"billsec":billsec}, "docs": docs.docs};
		res.setHeader('Content-Type', 'application/json');
		res.send(result);
	});
});

app.get('/api/cdrs/:id', cors(), function(req, res) {
    var id = req.params.id;
	var cdr = cloudant.use('safetelecom_cdr');
	cdr.find(
		{"selector": {"_id": id}},
		function(err, docs) {
		res.setHeader('Content-Type', 'application/json');
		res.send(docs);
		}
	);
});

app.get('/reports', cors(), function(req, res) {
	var limit = parseInt(req.query.limit) || undefined;
	var skip = parseInt(req.query.skip) || 0;
	var sort = req.query.sort ? req.query.sort : 'desc';
	var epochStart = req.query.start ? req.query.start : 1451943818334542;
	var epochEnd = req.query.end || Date.now().toString();
	var context = req.query.context ? req.query.context : 'undefined';


	var andArray = [];
	andArray.push({"variables.start_uepoch": {"$gte": epochStart}});
	if(typeof req.query.context != 'undefined') {
		if(req.query.context != 'all') {
			andArray.push({"callflow": { "$elemMatch": { "caller_profile.context": context}}});
		}
	}

	if(typeof req.query.end != 'undefined') {
		andArray.push({"variables.end_uepoch": {"$lte": req.query.end}});
	}

	var cdr = cloudant.use('safetelecom_cdr');
	var query = {
		"selector": {
			"$and": andArray
		},
		"sort": [{"variables.start_uepoch": sort}],
		"limit": limit,
		"fields": ["channel_data.direction", "variables.billsec", "variables.sip_from_user", "variables.sip_to_user", "variables.sip_to_host", "variables.start_stamp", "variables.answer_stamp", "variables.end_stamp", "variables.billsec", "variables.caller_id_name", "variables.start_uepoch", "callflow"],
		"skip": skip
	};
	console.log(query);
	cdr.find(query, function(err, docs) {
		var billsec = 0;
		docs.docs.forEach(function(value) {
			billsec += parseInt(value.variables.billsec);
		});
        var result = {"meta": {"length":docs.docs.length,"sort":sort,"limit":limit,"skip":skip,"billsec":billsec}, "docs": docs.docs};
		res.render('reports', { result: result, title: 'Detailed Call Records (context: ' + context + ')' });
	});
});

http.createServer(app).listen(app.get('port'), app.get('domain'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
