//Angular code
var app = angular.module('calendarApp', []);
app.run(function($rootScope, $q, $http) {
  $rootScope.calendar = $("#calendar").calendar(
  {
    view: "month",
    tmpl_path: "/tmpls/",
    modal_title: function(event) { return event.title },
    modal: "#events-modal",
    modal_type: "template",
    events_source: function () { return [
     {
        "id": 293,
        "title": "Event 1",
        "url": "javascript:void(0)",
        "class": "event-important",
        "start": 1422424903780, // Milliseconds
        "end": 1422434903780 // Milliseconds
      }
      ];},    onAfterViewLoad: function(view) {
      $('.btn-group button').removeClass('active');
      $('button[calendarView="' + view + '"]').addClass('active');
      $('.page-header h3').text(this.getTitle());

      $('a[data-event-id]').click(function() {
        $('#eventFrame').text($(this).attr('data-event-id'));
      });
    }
  });
  $rootScope.setViewLength = function(viewLength) {
    $rootScope.calendar.view(viewLength);
  }
  $rootScope.navigate = function(where) {
    $rootScope.calendar.navigate(where);
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
      //console.log($rootScope.calendars);
    });

    $rootScope.parseDatabaseEvents = function() {
      var eventList = [];

      $rootScope.calendars.forEach(function(element, index, array) {
        eventList = eventList.concat(element.events);
      });

      var calendarEventList = [];

      eventList.forEach(function(element, index, array) {
        var newEvent = {};
        newEvent.id = element._id;
        newEvent.title = element.name;
        newEvent.url = 'javascript:void(0)';
        newEvent.class = 'event-important';
        newEvent.start = element.start;
        newEvent.end = element.end;

        calendarEventList.push(newEvent);
      });

      $rootScope.events = calendarEventList;
    }
  }

  
  //Initialization
  $rootScope.getCalendarData();
});