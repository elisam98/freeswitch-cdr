
/**
 * Module dependencies.
 */

var express = require('express');
var cors = require('cors');
var routes = require('./routes');
var http = require('http');
var path = require('path');

// Load the Cloudant library.
var Cloudant = require('cloudant');
var me = 'safetelecom';
var password = 'chilling1102';

var cloudant = Cloudant({account:me, password:password});

var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
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
app.get('/api/cdr', cors(), function(req, res) {
	var cdr = cloudant.use('safetelecom_cdr');
	cdr.find(
		{
		"selector": {"variables.start_epoch":{"$gt": 0}},
		"sort": [{"variables.start_epoch": "desc"}]
		},
		function(err, docs) {
		res.setHeader('Content-Type', 'application/json');
		res.send(docs);
		}
	);
});

http.createServer(app).listen(app.get('port'), app.get('domain'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
