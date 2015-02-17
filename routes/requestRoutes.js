var express 	= require('express');
var mongoose 	= require('mongoose');
var User		= require('../models/User');
var Event 		= require('../models/Event');
var Calendar	= require('../models/Calendar');
var Alert		= require('../models/Alert');
var Repeat		= require('../models/Repeat');
var Request		= require('../models/Request');
var router 		= express.Router();

// route that adds users to Request object
router.put('/addUsers/:eventId', function (req, res, next) {

	var evPromise = Event.findOne({_id: req.params.eventId}).exec();
	var count;
	evPromise.addBack(function (err, myEv) {
		Request.findOne({_id: myEv.requestID}, function (err, request) {
			var tempStatus = request.usersStatus;
			if(request.usersStatus == undefined)
				tempStatus = {};

			request.usersStatus = null; // must do this 

			var p2 = User.find({email: {$in: req.body.users}}, '_id email').exec();

			p2.addBack(function (err, users) {
				users.forEach(function (user) {

					request.userIDs.push(user._id);
					tempStatus[user._id] = {status: 'pending', calId: null, email: user.email, copyEventId: null};

					User.update({_id: user._id}, {$push: {eventRequests: request._id}}, function (err, num, raw) {

					});
				});

				request.usersStatus = tempStatus;

				request.save(function (err, saved) {				
					res.send(saved);
				});				
			});
		});
	});
});

// route for when user accepts
router.put('/accept/:eventId', function (req, res, next) {

	var evPromise = Event.findOne({_id: req.params.eventId}).exec();

	evPromise.addBack(function (err, myEv) {

	});

	Request.findOne({_id: req.params.requestId}, function (err, request) {

		// request.usersStatus[req.session.user._id]
		// user.userGroups.splice(index, 1);

		// find calendar and create new copy of event
		// need calendarId of where event should go in req.body
		Calendar.findOne({_id: req.body.calendarId}, function (err, cal) {
			var copyEvent = new Event();
		});

		// go into request object and edit usersStatus
		// usersStatus needs to hold 'accept' in status, copyeventID, calendar, and email

	});
});

// route for when user denies
router.put('/deny/:requestId', function (req, res, next) {
	// change usersStatus to 'deny'
	Request.findOne({_id: req.params.requestId}, function (err, request) {
		request.usersStatus = null;
		request.usersStatus[req.session.user._id] = {status: "denied"};
		request.save();
	});
});

// route for when user removes
router.put('/remove/:requestId', function (req, res, next) {
	// change usersStatus to 'remove'
	Request.findOne({_id: req.params.requestId}, function (err, request) {
		request.usersStatus = null;
		request.usersStatus[req.session.user._id] = {status: "removed"};
		request.save();
	});
});

router.get('/create/it', function (req, res, next) {
	var newRequest = new Request();

	newRequest.usersStatus = {};

	newRequest.save();

	newRequest.usersStatus = {status: "pending"};

	newRequest.save();

	res.send(newRequest);

});

router.get('/create', function (req, res, next) {
	// var newReq = new Request();

	// var myRequest = Request.findOne({_id: "54de9f9944840012ca6c7833"})
	// 					   .exec();

	// myRequest.addBack(function (err, requestIThink) {

	// 	// var testObj = {};
	// 	// testObj['prop1'] = {propName: "name1"};
	// 	// testObj['prop2'] = {propName: "name2", addition: 5};
	// 	//requestIThink.usersStatus = {};
	// 	// var obj = requestIThink.usersStatus;
	// 	requestIThink.usersStatus['t1']['status'] = "WHAT";
	// 	// obj['t2'] = {status: "pending"};
	// 	// requestIThink.info = "changed text";
	// 	//requestIThink.usersStatus['testOrp'] = {status: 'pending'};
	// 	// requestIThink.usersStatus['t2'] = {status: "pending"};
	// 	// requestIThink.usersStatus = obj;
	// 	requestIThink.save(function (err, saved) {
	// 		if (err) next(err);
	// 		res.send(saved);
	// 	});
	// 	// res.send(testObj);
	// });

	Request.findOne({_id: "54df08c307da6d6718927886"}, function (err, request) {
		var obj = request.usersStatus;
		// obj['t1']['status'] = "PLEASE WORK";
		// request.usersStatus['t1']['status'] = "WORK PLEASE";
		request.usersStatus = null;
		// request.usersStatus = {};
		// request.usersStatus['t1'] = {status: 'pending'};
		// request.usersStatus['t2'] = {status: 'pending'};

		obj['t3'] = {status: 'did this work?'};

		request.usersStatus = obj;

		request.save(function (err, saved) {
			if (err) next(err);
			res.send(saved);
		})
	});

	// res.send(myRequest);

	// newReq.save(function (err, myReq) {
	// 	if(err)
	// 		next(err);

	// 	console.log("hello");
	// 	res.send(myReq);
	// });

});

router.get('/testMethod', function (req, res, next) {

		var p = User.convertToIds(['aaa', 'bbb']);

		p.addBack(function (err, args) {
			res.send(args);
		});

});

router.get('/getAll', function (req, res, next) {
	Request.find().exec(function (err, reqs) {
		res.send(reqs);
	});
});

module.exports = router