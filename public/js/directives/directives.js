var app = angular.module('myApp');

var compareTo = function() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function(scope, element, attributes, ngModel) {
             
            ngModel.$validators.compareTo = function(modelValue) {
                return modelValue == scope.otherModelValue;
            };
 
            scope.$watch("otherModelValue", function() {
                ngModel.$validate();
            });
        }
    };
};
 
app.directive("compareTo", compareTo);

var streamCard = function(){
    return {
        restrict: 'E',
        scope: {
            data: "="
        },
        templateUrl: 'js/directives/templates/streamCard.html',
        controller: function($scope){

        }
    }
}

app.directive("streamCard", streamCard);

var searchBar = function(){
    return {
        restrict: 'E',
        scope: {
            data: "="
        },
        templateUrl: 'js/directives/templates/searchBar.html',
        controller: function($scope, $http){

            $scope.$on('$routeChangeStart', function(next, current) { 
               $scope.searchInput = "";
               $scope.hover = false;
               $scope.focus = false;
               $scope.games = [];
               $scope.streamers = [];
            });

            $scope.hoverOnMenu = function(){
                $scope.hover = true;
            };
            $scope.hoverOffMenu = function(){
                $scope.hover = false;
                console.log("Test");
            };

            $scope.query = function(){
                $http.get('/api/game/search/' + $scope.searchInput).success(function(res) {
                    $scope.games = res;
                });
                $http.get('/api/streamer/search/' + $scope.searchInput).success(function(res) {
                    $scope.streamers = res;
                });
            };

        }
    }
}

app.directive("searchBar", searchBar);