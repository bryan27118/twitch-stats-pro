'use strict';

angular.module('myApp').factory('Auth', ['$q', '$http', '$location', '$rootScope',
    function($q, $http, $location, $rootScope) {
        var authService = {};
        $rootScope.authUser = null;

        authService.requestUser = function() {
            var deferred = $q.defer();
            console.log("Requesting User");
            $http.get('/auth/user').success(function(user) {
                if (user) {
                    $rootScope.authUser = user;
                    $rootScope.authUser.createdAt = new Date(user.createdAt).toDateString();
                }

                deferred.resolve(user);
            }).error(function(error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        authService.getUser = function() {
            return $rootScope.authUser;
        }

        authService.isLoggedIn = function() {
            return $rootScope.authUser != null;
        }

        authService.isAdmin = function() {
            return $rootScope.authUser.role == "admin";
        }

        authService.isUser = function() {
            return $rootScope.authUser.role == "user";
        }

        authService.login = function(creds) {
            var deferred = $q.defer();

            $http.post('/auth/login', creds).success(function(user) {
                if (user) {
                    $rootScope.authUser = user;
                    $location.path('/');
                    deferred.resolve(user);
                } else {
                    deferred.reject('Incorrect');
                }
            }).error(function(error) {
                deferred.reject("Incorrect Username or Password.");
            });

            return deferred.promise;
        }

        authService.signup = function(creds) {
            var deferred = $q.defer();

            if (creds.password != creds.repassword) {
                deferred.reject("Passwords do not match.");
                return deferred.promise;
            }

            if(creds.username.legnth < 3){
                deferred.reject("Username too short.");
                return deferred.promise;
            }

            if(creds.username.legnth > 8){
                deferred.reject("Username too long.");
                return deferred.promise;
            }

            $http.post('/auth/signup', creds).success(function(user) {
                if (user) {
                    $rootScope.authUser = user;
                    $location.path('/');
                    deferred.resolve(user);
                } else {
                    deferred.reject('Error Occurred');
                }
            }).error(function(error) {
                deferred.reject("Error Occurred.");
            });

            return deferred.promise;
        }

        authService.logout = function() {
            $rootScope.authUser = null;
            var deferred = $q.defer();

            $http.post('/auth/logout').success(function(user) {
                deferred.resolve(user);
            }).error(function(err) {
                deferred.reject(err);
            });

            return deferred.promise;
        }

        return authService;
    }
]);

angular.module('myApp').factory('Util', ['$q', '$http', '$location', '$rootScope',
    function($q, $http, $location, $rootScope) {
        var utilService = {};

        utilService.timeToString = function(timeMins){
            var YEAR_MIN = 60*24*365;
            var MONTH_MINS = 60*24*31;
            var WEEK_MINS = 60*24*7;
            var DAY_MINS = 60*24;
            var HOUR_MINS = 60;

            var years = Math.floor(timeMins/YEAR_MIN);
            var months = Math.floor((timeMins - years*YEAR_MIN)/MONTH_MINS);
            var weeks = Math.floor((timeMins- years*YEAR_MIN - months*MONTH_MINS)/WEEK_MINS);
            var days = Math.floor((timeMins- years*YEAR_MIN - months*MONTH_MINS - weeks*WEEK_MINS)/DAY_MINS);
            var hours = Math.floor((timeMins- years*YEAR_MIN - months*MONTH_MINS - weeks*WEEK_MINS - days*DAY_MINS)/HOUR_MINS);
            var mins = Math.floor(timeMins- years*YEAR_MIN - months*MONTH_MINS - weeks*WEEK_MINS - days*DAY_MINS - hours*HOUR_MINS);

            var timeString = "";

            if(years > 0){
                timeString = years + "yr "
            }

            if(months > 0){
                timeString = timeString + months + "mo "
            }

            if(weeks > 0){
                timeString = timeString + weeks + "w "
            }

            if(days > 0){
                timeString = timeString + days + "d "
            }

            if(hours > 0){
                timeString = timeString + hours + "h "
            }

            if(mins > 0){
                timeString = timeString + mins + "m"
            }
            
            return timeString;
        }

        return utilService;
    }
]);