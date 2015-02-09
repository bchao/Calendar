//Angular code
var app = angular.module('calendarApp', ['angular.filter', 'mwl.calendar']);
app.run(function($rootScope, $q, $http) {

  //Store a week in milliseconds
  var DAY = 1000*60*60*24;

  $rootScope.bottomSelector = -1;
  var currentYear = moment().year();
  var currentMonth = moment().month();

  $rootScope.events=[];
  $rootScope.calendarView = 'month';
  $rootScope.calendarDay = new Date();

  $rootScope.setViewLength = function(viewLength) {
    $rootScope.calendarView = viewLength;
    $rootScope.updateLocalEvents();
  }
  $rootScope.goToToday = function() {
    $rootScope.calendarDay = new Date();
    $rootScope.updateLocalEvents();
  }
  $rootScope.updateLocalEvents = function() {
    //$rootScope.localEvents = $rootScope.calendar.getEventsBetween($rootScope.calendar.getStartDate(),$rootScope.calendar.getEndDate());
  }

  $rootScope.parseDatabaseEvents = function() {
    var eventList = [];

    $rootScope.calendars.forEach(function(element, index, array) {
      eventList = eventList.concat(element.events);
    });

    var calendarEventList = [];

    for(var evNum=0;evNum<eventList.length;evNum++) {
      var element = eventList[evNum];
      element.start = new Date(element.start);
      element.end = new Date(element.end);
      $rootScope.calendars.forEach(function(calendar, cIndex, cArray) {
        if(calendar._id === element.calendar) {
          element.calendarName = calendar.name;
        }
      });
      element.canEditEvent = $rootScope.canEditEvent(element);
      element.canViewEvent = $rootScope.canViewEvent(element);

      var newEvent = {};
      newEvent.title = element.name;
      if(element.canViewEvent) {
        newEvent.type = 'warning';
      }
      else {
        newEvent.type = 'important';
        newEvent.title = 'Event';
      }
      newEvent.starts_at = element.start.getTime();
      newEvent.ends_at = element.end.getTime();

      newEvent.parentData = element;

      calendarEventList.push(newEvent);

      for(var rep=0;rep<element.repeats.length;rep++) {
        var repetition = element.repeats[rep];
        var weekdays = [];

        for(var weekdayNum=0; weekdayNum<repetition.days.length; weekdayNum++) {
          day = new Date(repetition.days[weekdayNum]);
          day = day.getDay() - element.start.getDay();
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
            eventIterations.push(angular.copy(newEvent));
            eventIterations[i].start +=  DAY * weekdays[weekdayIndex];
            eventIterations[i].end += DAY * weekdays[weekdayIndex];

            weekdays[weekdayIndex] += 7;
            weekdayIndex++;
            if(weekdayIndex >= weekdays.length) {
              weekdayIndex = 0;
            }
          }
          calendarEventList = calendarEventList.concat(eventIterations);
        }
        else if(repetition.endDate) {
          var endDate = new Date(repetition.endDate);
          var currentTime = new Date(newEvent.start);
          var eventIterations = [];
          var i = 0;
          while(currentTime < endDate) {
            eventIterations.push(angular.copy(newEvent));
            eventIterations[i].start +=  DAY * weekdays[weekdayIndex];
            eventIterations[i].end += DAY * weekdays[weekdayIndex];

            weekdays[weekdayIndex] += 7;
            weekdayIndex++;
            if(weekdayIndex >= weekdays.length) {
              weekdayIndex = 0;
            }

            currentTime = eventIterations[i].start;
            i++;
          }
          calendarEventList = calendarEventList.concat(eventIterations);
        }
      }
    }

    $rootScope.events = calendarEventList;
  }

  $rootScope.displayEventDetails = function(event) {
    $rootScope.bottomSelector=0;
    $rootScope.selectedEvent = event.parentData;
    console.log($rootScope.selectedEvent);
  }

  $rootScope.getCalendarData = function() {
    var ownGet = $http.get('/calendar/myCalId').
    success(function(data, status, headers, config) {
      $rootScope.myCalendars = angular.fromJson(data);

      $rootScope.myCalendars.forEach(function(element, index, array) {
        element.grouping = 'Owned Calendar';
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
      });

    }).
    error(function(data, status, headers, config) {
      console.log('Could not retrieve busy calendars.');
    });
    

    $q.all([ownGet, modGet, viewGet, busyGet]).then(function() {
      $rootScope.calendars = [];
      $rootScope.calendars = $rootScope.calendars.concat($rootScope.myCalendars, $rootScope.modCalendars, $rootScope.viewCalendars, $rootScope.viewBusyCalendars);

      
      var calendarEventPopulation = [];
      $rootScope.calendars.forEach(function(element, index, array) {
        calendarEventPopulation.push(
          $http.get('/calendar/id/'+element._id).
          success(function(data, status, headers, config) {
            element.events = angular.fromJson(data).events;
          })
        );
      });
      $q.all(calendarEventPopulation).then(function() {
        $rootScope.parseDatabaseEvents();
        $rootScope.updateLocalEvents();
      });
    });
  }

  $rootScope.displayEventCreator = function() {
    $rootScope.eventDetails = {};
    $rootScope.bottomSelector = 1;
  }

  $rootScope.editSelectedEvent = function() {
    $rootScope.eventDetails = $rootScope.selectedEvent;
    $rootScope.calendars.forEach(function(element, index, array) {
      if(element._id === $rootScope.selectedEvent.calendar) {
        $rootScope.eventDetails.calendar = element;
      }
    });
    $rootScope.bottomSelector = 1;
  }

  $rootScope.deleteSelectedEvent = function() {
    $rootScope.bottomSelector = -1;

    $http.delete('/event/'+$rootScope.selectedEvent._id).
    success(function(data, status, headers, config) {
      console.log('Event deleted: ' + $rootScope.selectedEvent._id);
      $rootScope.getCalendarData();
    }).
    error(function(data, status, headers, config) {
      console.log('Could not delete event: ' + $rootScope.selectedEvent._id);
    });
  }

  $rootScope.canEditEvent = function(event) {
    for(var i=0;i<$rootScope.myCalendars.length;i++) {
      if(event.calendar === $rootScope.myCalendars[i]._id) {
        return true;
      }
    }
    for(var i=0;i<$rootScope.modCalendars.length;i++) {
      if(event.calendar === $rootScope.modCalendars[i]._id) {
        return true;
      }
    }
    return false;
  }

  $rootScope.canViewEvent = function(event) {
    for(var i=0;i<$rootScope.viewBusyCalendars.length;i++) {
      if(event.calendar === $rootScope.viewBusyCalendars[i]._id) {
        return false;
      }
    }
    return true;
  }

  
  //Initialization
  $rootScope.getCalendarData();
  $rootScope.updateLocalEvents();
});