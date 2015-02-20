//Angular code
var app = angular.module('calendarApp', ['angular.filter', 'mwl.calendar', 'ui.bootstrap']);
app.run(function($rootScope, $q, $http, $modal) {

  //Store a week in milliseconds
  var DAY = 1000*60*60*24;

  $rootScope.bottomSelector = -1;
  var currentYear = moment().year();
  var currentMonth = moment().month();

  $rootScope.events=[];
  $rootScope.calendarView = 'month';
  $rootScope.calendarDay = new Date();

  $rootScope.getAllUsers = function() {
    $rootScope.userList = [];

    $http.get('/users').
    success(function(data, status, headers, config) {
      $rootScope.userList = angular.fromJson(data);
    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve list of users.');
    });
  }

  $rootScope.setViewLength = function(viewLength) {
    $rootScope.calendarView = viewLength;
    $rootScope.updateLocalEvents();
  }
  $rootScope.nav = function(direction) {
    //There is a race condition here that makes the update apply
    // before the calendar navigation.

    if(direction == 'back') {
      $rootScope.calendarControl.prev();
    }
    else if(direction == 'forward') {
      $rootScope.calendarControl.next();
    }

    updateOnDateChange();
  }

  var updateOnDateChange = function() {
    var originalValue = angular.copy($rootScope.calendarDay);
    console.log($rootScope.calendarDay);

    if(originalValue == $rootScope.calendarDay) {
      console.log(originalValue);
      console.log($rootScope.calendarDay);
      setTimeout(waitOnDateChange, 10);
      return;
    }
    console.log(originalValue);
    console.log($rootScope.calendarDay);
    originalValue = angular.copy($rootScope.calendarDay);
    $rootScope.updateLocalEvents();
  }

  $rootScope.goToToday = function() {
    $rootScope.calendarDay = new Date();
    $rootScope.updateLocalEvents();
  }
  $rootScope.updateLocalEvents = function() {
    var startPeriod = moment($rootScope.calendarDay).startOf($rootScope.calendarView).toDate();
    var endPeriod = moment($rootScope.calendarDay).endOf($rootScope.calendarView).toDate();
    $rootScope.localEvents = [];

    for(var eventIndex=0; eventIndex < $rootScope.events.length; eventIndex++) {
      var calEvent = $rootScope.events[eventIndex];
      if(calEvent.starts_at > startPeriod && calEvent.starts_at < endPeriod) {
        $rootScope.localEvents.push(calEvent);
      }
    }
  }

  $rootScope.parseDatabaseEvents = function() {
    var eventList = [];

    $rootScope.calendars.forEach(function(element, index, array) {
      eventList = eventList.concat(element.events);
    });

    var calendarEventList = [];

    for(var evNum=0;evNum<eventList.length;evNum++) {
      var element = eventList[evNum];
      var newEvent = $rootScope.convertDBEventToCalEvent(element);

      calendarEventList.push(newEvent);

      calendarEventList.concat(getRepeatedEventsInScope(element, newEvent));
    }

    $rootScope.events = calendarEventList;
    $rootScope.updateLocalEvents();
  }

  $rootScope.displayEventDetails = function(event) {
    $rootScope.selectedEvent = event.parentData;
    $modal.open({
        templateUrl: 'eventDetailsModal.html',
        controller: 'modalController'
      });
    console.log($rootScope.selectedEvent);
  }

  $rootScope.displayCreateEventModal = function() {
    $modal.open({
        templateUrl: 'createEventModal.html',
        controller: 'modalController'
      });
  }

  $rootScope.displayInviteUserModal = function() {
    $modal.open({
        templateUrl: 'inviteUserModal.html',
        controller: 'modalController'
      });
  }

  $rootScope.getCalendarData = function() {
    var ownGet = $http.get('/calendar/myCalId').
    success(function(data, status, headers, config) {
      $rootScope.myCalendars = angular.fromJson(data);

      $rootScope.myCalendars.forEach(function(element, index, array) {
        element.grouping = 'Owned Calendar';
        $rootScope.setEventData(element, "info", true, true);
      });

    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve owned calendars.');
    });

    var modGet = $http.get('/calendar/modCalId').
    success(function(data, status, headers, config) {
      $rootScope.modCalendars = angular.fromJson(data);

      $rootScope.modCalendars.forEach(function(element, index, array) {
        element.grouping = 'Modifiable Calendar';
        $rootScope.setEventData(element, "info", true, true);
      });

    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve modifiable calendars.');
    });


    var viewGet = $http.get('/calendar/canView').
    success(function(data, status, headers, config) {
      $rootScope.viewCalendars = angular.fromJson(data);

      $rootScope.viewCalendars.forEach(function(element, index, array) {
        element.grouping = 'Viewable Calendar';
        $rootScope.setEventData(element, "warning", true, false);
      });

    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve viewable calendars.');
    });


    var busyGet = $http.get('/calendar/canViewBusy').
    success(function(data, status, headers, config) {
      $rootScope.viewBusyCalendars = angular.fromJson(data);

      $rootScope.viewBusyCalendars.forEach(function(element, index, array) {
        element.grouping = 'Busy Calendar';
        $rootScope.setEventData(element, "important", false, false);
      });

    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve busy calendars.');
    });
    

    $q.all([ownGet, modGet, viewGet, busyGet]).then(function() {
      $rootScope.calendars = [];
      $rootScope.calendars = $rootScope.calendars.concat($rootScope.myCalendars, $rootScope.modCalendars, $rootScope.viewCalendars, $rootScope.viewBusyCalendars);
      $rootScope.parseDatabaseEvents();
    });
  }

  $rootScope.createNewEvent = function() {
    $rootScope.eventDetails = {
      start: Date.parse('today'),
      end: Date.parse('tomorrow')
    };
    $rootScope.displayCreateEventModal();
  }

  $rootScope.convertDBEventToCalEvent = function(dBEvent) {
    dBEvent.start = new Date(dBEvent.start);
    dBEvent.end = new Date(dBEvent.end);

    var newEvent = {};
    newEvent.title = dBEvent.name;
    newEvent.type = dBEvent.type;
    newEvent.starts_at = dBEvent.start.getTime();
    newEvent.ends_at = dBEvent.end.getTime();

    newEvent.parentData = dBEvent;

    return newEvent;
  }

  var getRepeatedEventsInScope = function(dBEvent, calEvent) {
    var eventList = [];

    for(var rep=0;rep<dBEvent.repeats.length;rep++) {
      var repetition = dBEvent.repeats[rep];
      var weekdays = [];

      for(var weekdayNum=0; weekdayNum<repetition.days.length; weekdayNum++) {
        day = new Date(repetition.days[weekdayNum]);
        day = day.getDay() - dBEvent.start.getDay();
        if(day <= 0) {
          day += 7;
        }

        weekdays[weekdayNum] = day;
      }

      weekdays.sort();

      var weekdayIndex = 0;
      if(repetition.frequency) {
        var eventIterations = [];
        for(var i=0; i<repetition.frequency;i++) {
          eventIterations.push(angular.copy(calEvent));
          eventIterations[i].starts_at +=  DAY * weekdays[weekdayIndex];
          eventIterations[i].ends_at += DAY * weekdays[weekdayIndex];

          weekdays[weekdayIndex] += 7;
          weekdayIndex++;
          if(weekdayIndex >= weekdays.length) {
            weekdayIndex = 0;
          }
        }
        eventList = eventList.concat(eventIterations);
      }
      else if(repetition.endDate) {
        var endDate = new Date(repetition.endDate);
        var currentTime = new Date(calEvent.starts_at);
        var eventIterations = [];
        var i = 0;
        while(currentTime < endDate) {
          eventIterations.push(angular.copy(calEvent));
          eventIterations[i].starts_at +=  DAY * weekdays[weekdayIndex];
          eventIterations[i].ends_at += DAY * weekdays[weekdayIndex];

          weekdays[weekdayIndex] += 7;
          weekdayIndex++;
          if(weekdayIndex >= weekdays.length) {
            weekdayIndex = 0;
          }

          currentTime = eventIterations[i].start;
          i++;
        }
        eventList = eventList.concat(eventIterations);
      }
    }

    return eventList;
  }

  $rootScope.setEventData = function(calendar, eventType, canView, canEdit) {
    calendar.events.forEach(function(dBEvent, index, array) {
      dBEvent.type = eventType;
      dBEvent.canViewEvent = canView;
      dBEvent.canEditEvent = canEdit;
      dBEvent.calendarName = calendar.name;
      dBEvent.calendarId = calendar._id;
    });
  }

  $rootScope.isValidTime = function(date) {
    if(date == undefined) {
      return false;
    }

    var timestamp=Date.parse(date);
    return isNaN(timestamp) == false;
  }

  $rootScope.getCalendar = function(calendarId) {
    var matchedCalendar;
    $rootScope.calendars.forEach(function(calendar, index, array) {
      if(calendar._id == calendarId) {
        matchedCalendar = calendar;
      }
    });

    return matchedCalendar;
  }

  $rootScope.addCalendar = function(calendar) {
    calendar.grouping = 'Owned Calendar';
    $rootScope.myCalendars.push(calendar);
    $rootScope.calendars.push(calendar);
  }

  $rootScope.deleteCalendar = function(calendarId) {
    for(var i=0; i < $rootScope.events.length; i++) {
      console.log($rootScope.events[i].parentData.calendar);
      while( i < $rootScope.events.length && $rootScope.events[i].parentData.calendar == calendarId) {
        $rootScope.events.splice(i, 1);
      }
    }

    for(var i=0; i < $rootScope.myCalendars.length; i++) {
      if($rootScope.myCalendars[i]._id == calendarId) {
        $rootScope.myCalendars.splice(i, 1);
        break;
      }
    }

    for(var i=0; i < $rootScope.calendars.length; i++) {
      if($rootScope.calendars[i]._id == calendarId) {
        $rootScope.calendars.splice(i, 1);
        break;
      }
    }

    $rootScope.updateLocalEvents();
  }

  $rootScope.findEvent = function(eventId) {
    for(var eventIndex=0; eventIndex < $rootScope.events.length; eventIndex++) {
      if($rootScope.events[eventIndex]._id == eventId) {
        return $rootScope.events[eventIndex];
      }
    }

    return undefined;
  }


  
  //Initialization
  $rootScope.getCalendarData();
  $rootScope.getAllUsers();
});