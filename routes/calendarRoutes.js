var express 	= require('express');
var mongoose	= require('mongoose');
var UserGroup 	= require('../models/UserGroup');
var Calendar 	= require('../models/Calendar');
var User 		= require('../models/User');
var Event		= require('../models/Event');
var Rule 		= require('../models/Rule');
var router 		= express.Router();

// post new calendar
router.post('/', function(req, res, next) {
	var newCal = new Calendar();
	newCal.name = req.body.name;

	newCal.owner = req.session.user._id;
	// for PostMan
	//newCal.owner = req.body.owner;

	newCal.save(function(err) {
		if(err) {
			next(err);
		}

		User.update({_id: req.session.user._id}, {$push: {myCalId: newCal._id}}, function(err, num, raw) {
		// for PostMan
		//User.update({_id: req.body.owner}, {$push: {myCalId: newCal._id}}, function(err, num, raw) {
			if (err) next(err);
		});

		res.json({ message: 'Calendar created!'});
	});
});

// adding user to calendar modList and calendar to users' modLists
router.put('/modList/add/:calId', function (req, res, next) {
	Calendar.update({_id: req.params.calId}, {$push: {modList: req.body.modList}}, function(err, num, raw) {
		if (err) next(err);
	});

	for(var i = 0; i < req.body.modList.length; i++) {
		User.update({_id: req.body.modList[i]}, {$push: {modCalId: req.params.calId}}, function (err, num, raw) {
			if(err) next(err);
		});
	}

	res.send("Users added to modList");
});

// removes users from calendar modList and calendar from users' modLists
router.put('/modList/remove/:calId', function (req, res, next) {
	Calendar.update({_id: req.params.calId}, {$pull: {modList: req.body.modList}}, function(err, num, raw) {
		if (err) next(err);
	});

	for(var i = 0; i < req.body.modList.length; i++) {
		User.update({_id: req.body.modList[i]}, {$pull: {modCalId: req.params.calId}}, function (err, num, raw) {
			if(err) next(err);
		});
	}

	res.send("Users removed from modList");
});

// get one Calendar based on its calId
router.get('/id/:calendarId', function (req, res, next) {
	// right now, it is returning whatever calendar is requested
	// it is not taking into account which user is trying to access it
	Calendar.findOne({_id: req.params.calendarId})
			.populate('events owner modList')
			.exec(function (err, calendar) {
				if(err) next(err);

				res.send(calendar);
			});

});

// get Calendars based on user's calType
router.get('/:calType', function (req, res, next) {
	console.log('\n\n');

	var uId = req.session.user._id;
	// var uId = "54d071f70226f73624abff24";

	User.findOne({_id: uId})
		.populate(req.params.calType)
		.exec(function (err, user) {
			if (err) {
				next(err);
			}

			var cType = req.params.calType;

			Calendar.find({_id: {$in: user[cType]}})
					.populate(req.params.calType )
					.exec(function (err, calendar) {
						if(err) next(err);

						for(var i = 0; i < calendar.length; i++) {
							Event.find({_id: {$in: calendar[i].events}})
								 .populate('name')
								 .exec(function(err, event) {
								 	if(err) next(err);

								 	user[cType].push(calendar);
								 	// res.send(user[cType]);
								 });
						}

						res.send(user[cType]);
					});
		});
});

router.get('/rules/:ruleId', function (req, res, next) {
	var r = Rule.findOne({_id: req.params.ruleId})
		.exec(function (err, rule) {
			// res.send(rule);
			console.log("HEY" + rule.getAllUsersInRule());
			res.send(rule.getAllUsersInRule());
		});

	// res.send(r.getAllUsersInRule());

});

// deletes entire Calendar, its events, its rules, and ref to them in users
router.delete('/:calId', function (req, res, next) {
	Calendar.findOne({_id: req.params.calId}, function (err, calendar) {
		// delete events
		for(var i = 0; i < calendar.events.length; i++) {
			Event.findByIdAndRemove(calendar.events[i], {}, function (err, obj) {
				if(err) next(err);
			});
		}

		// rules

		// remove calId from users
		User.findByIdAndRemove(calendar.owner, {}, function (err, obj) {
			if(err) next(err);
		});

		for(var k = 0; k < calendar.modList.length; k++) {
			User.findByIdAndRemove(calendar.modList[k], {}, function (err, obj) {
				if (err) next(err);
			});
		}
	});
});

module.exports = router;