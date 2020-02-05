'use strict';

var app = angular.module('myApp');

app.controller('AuthController', ['$scope', '$location', 'Auth', '$routeParams',
    function($scope, $location, Auth, $routeParams) {
        $scope.loginError = $routeParams.error;
        $scope.user = {};
        $scope.dataLoading = false;

        $scope.login = function() {
            $scope.loginError = "";
            $scope.dataLoading = true;
            var promise = Auth.login($scope.user);
            promise.then(function(status) { //Success
                $scope.dataLoading = false;
                $location.path("/");
            }, function(status) { //Failed
                $scope.dataLoading = false;
                $scope.loginError = status;
            });
        }

        $scope.signup = function() {
            $scope.loginError = "";
            $scope.dataLoading = true;
            var promise = Auth.signup($scope.user);
            promise.then(function(status) { //Success
                $scope.dataLoading = false;
                $location.path("/");
            }, function(status) { //Failed
                $scope.dataLoading = false;
                $scope.loginError = status;
            });
        }

        $scope.logout = function() {
            var promise = Auth.logout();
            promise.then(function(status) { //Success
                $location.path($location.path());
            }, function(status) { //Failed

            });
        }

    }
]);

app.controller('NavbarController', ['$scope', '$location', 'Auth',
    function($scope, $location, Auth) {

        $scope.logout = function() {
            var promise = Auth.logout();
            promise.then(function(status) { //Success
                $location.path('/');
            }, function(status) { //Failed

            });
        }

        $scope.isUser = function(){
            return Auth.isUser();
        }

        $scope.isAdmin = function(){
            return Auth.isAdmin();
        }

        $scope.isLoggedIn = function(){
            return Auth.isLoggedIn();
        }
    }
]);

app.controller('MainController', ['$scope', 'Auth', '$http',
    function($scope, Auth, $http) {
        $scope.games = {};
        $scope.streamers = {};
        var defaultAmount = 16;
        var gameOffset = 0;
        var streamerOffset = 0;
        $scope.endOfGames = false;
        $scope.endOfStreamers = false;

        function refreshGames() {
            $scope.success = "";
            $http.get('/api/game/all/base/' + defaultAmount + '/' + gameOffset).success(function(res) {
                if(res.length < defaultAmount){
                    $scope.endOfGames = true;
                }
                $scope.games = res;
            });
        }
        refreshGames();

        function refreshStreamers() {
            $scope.success = "";
            $http.get('/api/streamer/all/overview/' + defaultAmount + '/' + streamerOffset).success(function(res) {
                if(res.length < defaultAmount){
                    $scope.endOfStreamers = true;
                }

                $scope.streamers = res;
            });
        }
        refreshStreamers();

        $scope.fetchMoreGames = function(){
            gameOffset += defaultAmount;
            $http.get('/api/game/all/base/' + defaultAmount + '/' + gameOffset).success(function(res) {
                if(res.length < defaultAmount){
                    $scope.endOfGames = true;
                }
                $scope.games = $scope.games.concat(res);
            });
        }

        $scope.fetchMoreStreamers = function(){
            streamerOffset += defaultAmount;
            $http.get('/api/streamer/all/overview/' + defaultAmount + '/' + streamerOffset).success(function(res) {
                if(res.length < defaultAmount){
                    $scope.endOfStreamers = true;
                }
                $scope.streamers = $scope.streamers.concat(res);
            });
        }
    }
]);

app.controller('StreamListController', ['$scope', '$location', 'Auth',
    function($scope, $location, Auth) {
        
    }
]);

app.controller('StreamerController', ['$scope', 'Auth', 'Util', '$location', '$http',
    function($scope, Auth, Util, $location, $http) {
        var id = $location.path().split("/")[2] || "Unknown";
        var timeout = {};
        $scope.id = id;
        $scope.streams = {};
        $scope.streamData = [];
        $scope.streamerData = {};
        $scope.chartSelectOption = 1;

        $scope.amChartOptions = {
            data: [],
            type: "serial",
            theme: 'black',
            categoryField: "date",
            legend: {
                enabled: true,
                useGraphSetting: true
            },
            trendLines: [],
            chartScrollbar: {
                enabled: true,
            },
            chartCursor: {
                "enabled": true,
                "categoryBalloonDateFormat": "EEE D LL:NN A"
            },
            categoryAxis: {
                minPeriod: "mm",
                parseDates: true
            },
            valueAxes: [{
                position: "left",
                title: "Followers",
                axisColor: "#FF6600",
                axisThickness: 3,
                gridThickness: 0
            },
            {
                position: "right",
                id: "valueAxis2", 
                title: "Views",
                axisColor: "#E4D700",
                axisThickness: 3,
                gridThickness: 0
            }],
            graphs: [{
                bullet: "none",
                title: "Followers",
                color: "#FF6600",
                valueField: "followers"
            },
            {
                bullet: "none",
                title: "Views",
                valueField: "views",
                color: "#E4D700",
                valueAxis: "valueAxis2"
            }],
            guides: [],
        }

        getGraphData();

        $scope.$on('$destroy',function(){
            clearTimeout(timeout);
        });

        function getChart(id) {
            var allCharts = AmCharts.charts;
            for (var i = 0; i < allCharts.length; i++) {
                if (id == allCharts[i].div.id) {
                    return allCharts[i];
                }
            }
        }

        function getGraphData(){
            $http.get('/api/streamer/' + id + "/StreamerData/" + 1 + "/"+ 0).then(function(res) {
                for(var i = 0; i < res.data.length; i ++){
                    $scope.amChartOptions.data.push({
                        date: res.data[i].timestamp,
                        followers: res.data[i].followers,
                        views: res.data[i].views
                    });
                }
                getChart("dataChart").validateData();
            });
        }

        $scope.chartSelect = function(option){
            getChart("dataChart").dataProvider  = [];
            if(option == 1){ // Day
                $scope.chartSelectOption = 1;
                $http.get('/api/streamer/' + id + "/StreamerData/" + 1 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        getChart("dataChart").dataProvider.push({
                            date: res.data[i].timestamp,
                            followers: res.data[i].followers,
                            views: res.data[i].views
                        });
                    }
                    getChart("dataChart").validateData();
                });
            }else if(option == 2){   //Week
                $scope.chartSelectOption = 2;
                $http.get('/api/streamer/' + id + "/StreamerData/" + 7 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        getChart("dataChart").dataProvider.push({
                            date: res.data[i].timestamp,
                            followers: res.data[i].followers,
                            views: res.data[i].views
                        });
                    }
                    getChart("dataChart").validateData();
                });
            }else if(option == 3){   //Month
                $scope.chartSelectOption = 3;
                $http.get('/api/streamer/' + id + "/StreamerData/" + 31 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        getChart("dataChart").dataProvider.push({
                            date: res.data[i].timestamp,
                            followers: res.data[i].followers,
                            views: res.data[i].views
                        });
                    }
                    getChart("dataChart").validateData();
                });
            }else if(option == 4){   //All
                $scope.chartSelectOption = 4;
                $http.get('/api/streamer/' + id + "/StreamerData/all").then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        getChart("dataChart").dataProvider.push({
                            date: res.data[i].timestamp,
                            followers: res.data[i].followers,
                            views: res.data[i].views
                        });
                    }
                    getChart("dataChart").validateData();
                });
            }
        }

        function init(){
            $http.get('/api/streamer/' + id + '/base').then(function(res) {
                $scope.streamerData = res.data;
                $scope.streamerData.stats.avgStreamLengthWeek = Util.timeToString($scope.streamerData.stats.avgStreamLengthWeek);
                $scope.streamerData.stats.totalStreamTimeWeek = Util.timeToString($scope.streamerData.stats.totalStreamTimeWeek);
                $scope.streamerData.stats.totalStreamTimeMonth = Util.timeToString($scope.streamerData.stats.totalStreamTimeMonth);
                $scope.streamerData.stats.avgStreamLengthAll = Util.timeToString($scope.streamerData.stats.avgStreamLengthAll);
                $scope.streamerData.stats.totalStreamTimeAll = Util.timeToString($scope.streamerData.stats.totalStreamTimeAll);
                $scope.gameData = extractGameData();

                for(var i = 0; i < $scope.streamerData.gameData.length; i++){
                    $scope.streamerData.gameData[i].playtime =Util.timeToString($scope.streamerData.gameData[i].playtime);
                }

                $http.get('/api/streamer/' + id + "/Streams/" + 5 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i++){
                        res.data[i].startTime = moment(res.data[i].startTime).format('MMM D YYYY h:mm a');
                        res.data[i].stats.streamLength = Util.timeToString(res.data[i].stats.streamLength);
                        res.data[i].gameArt = "https://static-cdn.jtvnw.net/ttv-boxart/" + res.data[i].games[res.data[i].games.length - 1].name + "-52x72.jpg";
                        $scope.streamData.unshift(res.data[i]);
                    }
                });
            });

            timeout = setTimeout(function(){
                $scope.fetchStreamerData();
            }, 5*60*1000);
        }
        init();

        $scope.fetchStreamerData = function(){
            $http.get('/api/streamer/' + id + "/StreamerData/newest").then(function(res) {
                $scope.amChartOptions.data.push({
                    date: res.data.timestamp,
                    followers: res.data.followers,
                    views: res.data.views
                });
                getChart("dataChart").validateData();
            });

            timeout = setTimeout(function(){
                $scope.fetchStreamerData();
            }, 5*60*1000);
        }

        function extractGameData(){
            var SData = [];

            for(var i = 0; i < $scope.streamerData.gameData.length; i ++){
                SData.push({key: $scope.streamerData.gameData[i].name, y: $scope.streamerData.gameData[i].playtime});
            }

            return SData;
        }
    }
]);

app.controller('StreamController', ['$scope', 'Auth', 'Util', '$location', '$http',
    function($scope, Auth, Util, $location, $http) {
        var id = $location.path().split("/")[2] || "Unknown";
        var timeout = {};
        $scope.streams = {};
        $scope.streamData = {};

        $scope.amChartOptions = {
            data: [],
            type: "serial",
            theme: 'black',
            categoryField: "date",
            /*
            legend: {
                enabled: true,
                useGraphSetting: true
            },*/
            trendLines: [],
            chartScrollbar: {
                enabled: true,
            },
            chartCursor: {
                "enabled": true,
                "categoryBalloonDateFormat": "EEE D LL:NN A"
            },
            categoryAxis: {
                minPeriod: "mm",
                parseDates: true
            },
            valueAxes: [{
                position: "left",
                title: "Viewers",
                axisColor: "#FF6600",
                axisThickness: 3,
                gridThickness: 0
            }],
            graphs: [{
                bullet: "none",
                title: "Viewers",
                color: "#FF6600",
                valueField: "viewers"
            }],
            guides: [],
        }
        getGraphData();

        function getChart(id) {
            var allCharts = AmCharts.charts;
            for (var i = 0; i < allCharts.length; i++) {
                if (id == allCharts[i].div.id) {
                    return allCharts[i];
                }
            }
        }

        function getGraphData(){
            //var data = [];
            $http.get('/api/stream/' + id + "/StreamData/all").then(function(res) {
                for(var i = 0; i < res.data.length; i ++){
                    $scope.amChartOptions.data.push({
                        date: res.data[i].timestamp,
                        viewers: res.data[i].viewers,
                    });
                }
                getChart("dataChart").validateData();
                //return data;
            });
        }

        $scope.$on('$destroy',function(){
            clearTimeout(timeout);
        });

        function init(){
            $http.get('/api/stream/' + id).then(function(res) {
                $scope.streamData = res.data;
                $scope.streamData.stats.watchTime = Util.timeToString($scope.streamData.stats.streamLength*$scope.streamData.stats.avgViewers);
                $scope.streamData.stats.streamLength = Util.timeToString($scope.streamData.stats.streamLength);
                $scope.streamData.startTime = moment($scope.streamData.startTime).format('MMM D YYYY h:mm a');
                if($scope.streamData.live == true){
                    $scope.streamData.endTime = "Live Now";
                }else{
                    $scope.streamData.endTime = moment($scope.streamData.endTime).format('MMM D YYYY h:mm a');
                }

                if($scope.streamData.live == true){
                    timeout = setTimeout(function(){
                        $scope.fetchStreamData();
                    }, 5*60*1000);
                }
            });

        }
        init();

        $scope.fetchStreamData = function(){
            $http.get('/api/stream/' + id + "/StreamData/newest").then(function(res) {
                $scope.amChartOptions.data.push({
                    date: res.data.timestamp,
                    viewers: res.data.viewers,
                });
            });

            timeout = setTimeout(function(){
                $scope.fetchStreamData();
            }, 5*60*1000);
        }
    }
]);

app.controller('GameController', ['$scope', 'Auth', '$location', '$http', 
    function($scope, Auth, $location, $http) {
        var id = $location.path().split("/")[2] || "Unknown";
        var timeout = {};
        $scope.refreshRate = 1*60*1000;
        $scope.gameInfo = {};
        $scope.chartSelectOption = 1; //1 = Day 2 = Week 3 = Month 4 = All

        $scope.amChartOptions = {
            data: [],
            type: "serial",
            theme: 'black',
            categoryField: "date",
            legend: {
                enabled: true,
                useGraphSetting: true
            },
            trendLines: [],
            chartScrollbar: {
                enabled: true,
            },
            chartCursor: {
                "enabled": true,
                "categoryBalloonDateFormat": "EEE D LL:NN A"
            },
            categoryAxis: {
                minPeriod: "mm",
                parseDates: true
            },
            valueAxes: [{
                position: "left",
                title: "Viewers",
                axisColor: "#FF6600",
                axisThickness: 3,
                gridThickness: 0
            },
            {
                position: "right",
                id: "valueAxis2", 
                title: "Channels",
                axisColor: "#E4D700",
                axisThickness: 3,
                gridThickness: 0
            }],
            graphs: [{
                bullet: "none",
                title: "Viewers",
                color: "#FF6600",
                valueField: "viewers"
            },
            {
                bullet: "none",
                title: "Channels",
                color: "#E4D700",
                valueField: "channels",
                valueAxis: "valueAxis2"
            }],
            guides: [],
        }

        $scope.breakdownChartOptions = {
            data: [],
            type: "pie",
            angle: 12,
            theme: "black",
            balloonText: "<strong>[[title]]</strong><br><span style='font-size:14px'><b>[[value]]</b> ([[percents]]%)</span>",
            depth3D: 15,
            titleField: "channel",
            categoryField: "channel",
            valueField: "viewers",
        }
        getGraphData();

        $scope.$on('$destroy',function(){
            clearTimeout(timeout);
        });

        function init(){
            $http.get('/api/game/' + id + '/base').then(function(res) {
                $scope.gameInfo = res.data;
            });

            timeout = setTimeout(function(){
                $scope.fetchNewGameData();
            }, $scope.refreshRate);
        }
        init();

        function getChart(id) {
            var allCharts = AmCharts.charts;
            for (var i = 0; i < allCharts.length; i++) {
                if (id == allCharts[i].div.id) {
                    return allCharts[i];
                }
            }
        }

        function getGraphData(){
            //var data = [];
            $http.get('/api/game/' + id + "/GameData/" + 1 + "/"+ 0).then(function(res) {
                for(var i = 0; i < res.data.length; i ++){
                    $scope.amChartOptions.data.push({
                        date: res.data[i].timestamp,
                        viewers: res.data[i].viewers,
                        channels: res.data[i].channels
                    });
                }
                getChart("dataChart").validateData();

                $http.get('/api/game/' + id +'/streams').then(function(streams) {
                    extractStreamsData(streams.data.streams);
                });
                //return data;
            });
        }

        $scope.chartSelect = function(option){

            var chart = getChart("dataChart");

            chart.dataProvider  = [];
            if(option == 1){ // Day
                $scope.chartSelectOption = 1;
                $http.get('/api/game/' + id + "/GameData/" + 1 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        chart.dataProvider.push({
                            date: res.data[i].timestamp,
                            viewers: res.data[i].viewers,
                            channels: res.data[i].channels
                        });
                    }
                    chart.validateData();
                });
            }else if(option == 2){   //Week
                $scope.chartSelectOption = 2;
                $http.get('/api/game/' + id + "/GameData/" + 7 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        chart.dataProvider.push({
                            date: res.data[i].timestamp,
                            viewers: res.data[i].viewers,
                            channels: res.data[i].channels
                        });
                    }
                    chart.validateData();
                });
            }else if(option == 3){   //Month
                $scope.chartSelectOption = 3;
                $http.get('/api/game/' + id + "/GameData/" + 31 + "/"+ 0).then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        chart.dataProvider.push({
                            date: res.data[i].timestamp,
                            viewers: res.data[i].viewers,
                            channels: res.data[i].channels
                        });
                    }
                    chart.validateData();
                });
            }else if(option == 4){   //All
                $scope.chartSelectOption = 4;
                $http.get('/api/game/' + id + "/GameData/all").then(function(res) {
                    for(var i = 0; i < res.data.length; i ++){
                        chart.dataProvider.push({
                            date: res.data[i].timestamp,
                            viewers: res.data[i].viewers,
                            channels: res.data[i].channels
                        });
                    }
                    chart.validateData();
                });
            }
        }

        $scope.fetchNewGameData = function(){
            console.log("New Data");
            $http.get('/api/game/' + id + "/GameData/newest").then(function(res) {
                getChart("dataChart").dataProvider.push({
                    date: res.data.timestamp,
                    viewers: res.data.viewers,
                    channels: res.data.channels
                });
                getChart("dataChart").validateData();

                $http.get('/api/game/' + id +'/streams').then(function(streams) {
                    extractStreamsData(streams.data.streams);
                });
            });

            timeout = setTimeout(function(){
                $scope.fetchNewGameData();
            }, $scope.refreshRate);
        }

        function extractStreamsData(streams){
            var total = 0;
            var currentViewers = $scope.amChartOptions.data[$scope.amChartOptions.data.length-1].viewers;
            var currentChannels = $scope.amChartOptions.data[$scope.amChartOptions.data.length-1].channels;
            var chart = getChart("breakdownPie");

            if($scope.breakdownChartOptions.data.length != 0){
                chart.dataProvider  = [];
            }

            for(var i = 0; i < streams.length; i ++){
                total += streams[i].viewers;
                chart.dataProvider.push({
                    channel: streams[i].channel.display_name,
                    viewers: streams[i].viewers
                });
            }

            chart.dataProvider.push({
                channel: "" + (currentChannels - 25) + " Others",
                viewers: (currentViewers - total)
            });

            getChart("breakdownPie").validateData();

        }

    }
]);

app.controller('VerificationController', ['$scope', 'Auth', '$http','$routeParams',
    function($scope, Auth, $http, $routeParams) {
        $scope.token = $routeParams.token;
        $scope.success = "";
        $scope.error = "";

        $scope.verifyEmail = function(){
            $scope.success = "";
            $scope.error = "";
            $http.post('/api/email/verify', {token: $scope.token}).success(function(res) {
                if(res == "true"){
                    $scope.success = "Email verified";
                    Auth.requestUser();
                }else{
                    $scope.error = res;
                }
            });
        }
        
    }
]);

app.controller('AccountController', ['$scope', 'Auth', '$http',
    function($scope, Auth, $http) {
        $scope.currentTab = 0;
        $scope.error = "";
        $scope.success = "";
        $scope.dataLoading = false;
        $scope.user = {};
        $scope.setTab = function(tab){
            $scope.currentTab = tab;
        }

        $scope.updatePassword = function(){
            $scope.error = "";
            $scope.success = "";
            
            if($scope.user.newpassword != $scope.user.newrepassword){
                $scope.error = "Passwords do not match";
                return
            }

            $scope.dataLoading = true;
            $http.post('/api/user/password', $scope.user).success(function(res) {
                $scope.dataLoading = false;
                if(res == 'true'){
                    Auth.requestUser();
                    $scope.success = "Password Updated";
                }else{
                    $scope.error = res;
                }
                $scope.user = {};
            });
        }

        $scope.updateEmail = function(){
            $scope.error = "";
            $scope.success = "";
            $scope.dataLoading = true;

            $http.post('/api/user/email', $scope.user).success(function(res) {
                $scope.dataLoading = false;
                if(res == 'true'){
                    Auth.requestUser();
                    $scope.success = "Email Updated";
                }else{
                    $scope.error = res;
                }
                $scope.user = {};
            });
        }

        $scope.updateSettings = function(){
            
            if($scope.user.allowemail == null){
                $scope.user.allowemail = false;
            }

            $scope.error = "";
            $scope.success = "";
            $scope.dataLoading = true;

            $http.post('/api/user/settings', $scope.user).success(function(res) {
                $scope.dataLoading = false;
                if(res == 'true'){
                    Auth.requestUser();
                    $scope.success = "Settings Updated";
                }else{
                    $scope.error = res;
                }
                $scope.user = {};
            });

        }

        $scope.resendVerify = function(){
            $scope.success = "";
            $http.post('/api/email/reverify').success(function(res) {
                if(res == 'true'){
                    Auth.requestUser();
                    $scope.success = "Email Sent";
                }else{
                    $scope.error = res;
                }
            });
        }
    }
]);

app.controller('AdminController', ['$scope', 'Auth', '$http',
    function($scope, Auth, $http) {
        $scope.currentTab = 0;
        $scope.users = {};
        $scope.selectedUserIndex = 0;
        $scope.selectedUser = {};

        $scope.userEmail = {};
        $scope.massEmail = {};
        $scope.newGame = {};
        $scope.games = {};
        $scope.newStream = {};
        $scope.streamers = {};
        $scope.crawlData = {numberOfGames: 10, numberOfStreamers: 25}
        $scope.crawlGameData = {gameName: "", numberOfStreamers: 25}
        $scope.success = "";
        $scope.error = "";
        $scope.dataLoading = false;

        $scope.setTab = function(tab){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = false;
            if(tab == 1 || tab == 4){
                refreshUsers();
            }else if (tab == 2){
                refreshGames();
            }else if (tab == 3){
                refreshStreams();
            }
            $scope.currentTab = tab;
        }

        $scope.setSelectedUser = function(index){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = false;
            $scope.userEmail = {};
            $scope.selectedUserIndex = index;
            $scope.selectedUser = $scope.users[index];
        }

        $scope.editUser = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;
            $http.post('/api/user/role/' + $scope.selectedUser._id, $scope.selectedUser).success(function(res) {
                $http.post('/api/user/email/' + $scope.selectedUser._id, $scope.selectedUser).success(function(res) {
                    $scope.dataLoading = false;
                    $scope.success = "User Updated";
                    $scope.users[$scope.selectedUser] = res;

                });
            });
        }

        $scope.createGame = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;
            $http.post('/api/game/create', {name: $scope.newGame.name}).success(function(res) {
                $scope.dataLoading = false;
                if(res.status == true){
                    refreshGames();
                }else{
                    $scope.error = res.error;
                }
            });
        }

        $scope.createStream = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;
            $http.post('/api/streamer/create', {name: $scope.newStream.name}).success(function(res) {
                $scope.dataLoading = false;
                if(res.status == true){
                    refreshStreams();
                }else{
                    $scope.error = res.error;
                }
            });
        }

        $scope.deleteGame = function(index){
            $http.delete('/api/game/delete/' + $scope.games[index].gameID).success(function(res) {
                refreshGames();
            });
        }

        $scope.deleteStreamer = function(index){
            $http.delete('/api/streamer/delete/' + $scope.streamers[index].streamerID).success(function(res) {
                refreshStreams();
            });
        }

        $scope.sendMail = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;
            $http.post('/api/tools/email/user/' + $scope.selectedUser._id, {subject: $scope.userEmail.subject, message: $scope.userEmail.message}).success(function(res) {
                $scope.success = "Message Sent";
                $scope.userEmail = {};
                $scope.dataLoading = false;
            });
        }

        $scope.crawlSubmit = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;

            $http.post('/api/tools/crawlTwitch', $scope.crawlData).success(function(res) {
                if(res.status == false){
                    $scope.error = res.error;
                }else{
                    $scope.success = "Done";
                }
                $scope.dataLoading = false;
            });
        }

        $scope.calculateGameStats = function(){
            $scope.success = "";
            $scope.error = "";

            $http.get('/api/tools/calculateGameStats').success(function(res) {
                if(res.status == false){
                    $scope.error = res.error;
                }else{
                    $scope.success = "Calculate Game Stats: Done";
                }
            });
        }

        $scope.calculateStreamerStats = function(){
            $scope.success = "";
            $scope.error = "";

            $http.get('/api/tools/calculateStreamerStats').success(function(res) {
                if(res.status == false){
                    $scope.error = res.error;
                }else{
                    $scope.success = "Calculate Streamer Stats: Done";
                }
            });
        }

        $scope.calculateStreamStats = function(){
            $scope.success = "";
            $scope.error = "";

            $http.get('/api/tools/calculateStreamStats').success(function(res) {
                if(res.status == false){
                    $scope.error = res.error;
                }else{
                    $scope.success = "Calculate Stream Stats: Done";
                }
            });
        }

        $scope.crawlGameSubmit = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;

            $http.post('/api/tools/crawlTwitch/' + $scope.crawlGameData.gameName, $scope.crawlGameData).success(function(res) {
                $scope.success = "Done";
                $scope.dataLoading = false;
            });
        }

        $scope.massMail = function(){
            $scope.success = "";
            $scope.error = "";
            $scope.dataLoading = true;
            $http.post('/api/tools/email/all', {subject: $scope.massEmail.subject, message: $scope.massEmail.message}).success(function(res) {
                $scope.success = "Message Sent";
                $scope.massEmail = {};
                $scope.dataLoading = false;
            });
        }

        var refreshUsers = function() {
            $scope.success = "";
            $scope.error = "";
            $scope.selectedUserIndex = 0;
            $scope.selectedUser = {};
            $http.get('/api/user/all').success(function(res) {
                $scope.users = res;
                $scope.selectedUser = $scope.users[$scope.selectedUserIndex];
            });
        }

        var refreshGames = function() {
            $scope.success = "";
            $scope.error = "";
            $http.get('/api/game/all/overview/50/0').success(function(res) {
                $scope.games = res;
            });
        }

        var refreshStreams = function() {
            $scope.success = "";
            $scope.error = "";
            $http.get('/api/streamer/all/overview/50/0').success(function(res) {
                $scope.streamers = res;
            });
        }
    }
]);