(function () {
  var dateFormatter = function (value) {
    if (!value) {
      return "-";
    }

    return value.format(clientConfig.dateTimeFormat);
  };

  var QuerySearchCtrl = function($scope, $location, $filter, Events, Query) {
    $scope.$parent.pageTitle = "Queries Search";

    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
    };

    $scope.gridColumns = [
      {
        "label": "Name",
        "map": "name",
        "cellTemplateUrl": "/views/queries_query_name_cell.html"
      },
      {
        'label': 'Created By',
        'map': 'user.name'
      },
      {
        'label': 'Created At',
        'map': 'created_at',
        'formatFunction': dateFormatter
      },
      {
        'label': 'Update Schedule',
        'map': 'schedule',
        'formatFunction': function (value) {
          return $filter('scheduleHumanize')(value);
        }
      }
    ];

    $scope.queries = [];
    $scope.$parent.term = $location.search().q;

    Query.search({q: $scope.term }, function(results) {
      $scope.queries = _.map(results, function(query) {
        query.created_at = moment(query.created_at);
        return query;
      });
    });

    $scope.search = function() {
      if (!angular.isString($scope.term) || $scope.term.trim() == "") {
        $scope.queries = [];
        return;
      }

      $location.search({q: $scope.term});
    };

    Events.record(currentUser, "search", "query", "", {"term": $scope.term});
  };

  var QueriesCtrl = function ($scope, $http, $location, $filter, Query) {
    $scope.$parent.pageTitle = "All Queries";
    $scope.gridConfig = {
      isPaginationEnabled: true,
      itemsByPage: 50,
      maxSize: 8,
      isGlobalSearchActivated: true};

    $scope.allQueries = [];
    $scope.queries = [];

    var filterQueries = function () {
      $scope.queries = _.filter($scope.allQueries, function (query) {
        if (!$scope.selectedTab) {
          return false;
        }

        if ($scope.selectedTab.key == 'my') {
          return query.user.id == currentUser.id && query.name != 'New Query';
        } else if ($scope.selectedTab.key == 'drafts') {
          return query.user.id == currentUser.id && query.name == 'New Query';
        }

        return query.name != 'New Query';
      });
    }

    Query.query(function (queries) {
      $scope.allQueries = _.map(queries, function (query) {
        query.created_at = moment(query.created_at);
        query.retrieved_at = moment(query.retrieved_at);
        return query;
      });

      filterQueries();
    });

    $scope.gridColumns = [
      {
        "label": "Name",
        "map": "name",
        "cellTemplateUrl": "/views/queries_query_name_cell.html"
      },
      {
        'label': 'Created By',
        'map': 'user.name'
      },
      {
        'label': 'Created At',
        'map': 'created_at',
        'formatFunction': dateFormatter
      },
      {
        'label': 'Runtime',
        'map': 'run_time',
        'formatFunction': function (value) {
          return $filter('durationHumanize')(value);
        }
      },
      {
        'label': 'Last Executed At',
        'map': 'retrieved_at',
        'formatFunction': dateFormatter
      },
      {
        'label': 'Update Schedule',
        'map': 'schedule',
        'formatFunction': function (value) {
          return $filter('scheduleHumanize')(value);
        }
      }
    ]

    $scope.tabs = [
      {"name": "My Queries", "key": "my"},
      {"key": "all", "name": "All Queries"},
      {"key": "drafts", "name": "Drafts"}
    ];

    $scope.$watch('selectedTab', function (tab) {
      if (tab) {
        $scope.$parent.pageTitle = tab.name;
      }

      filterQueries();
    });
  }

  var MainCtrl = function ($scope, $location, Dashboard) {
    $scope.$on("$routeChangeSuccess", function (event, current, previous, rejection) {
      if ($scope.showPermissionError) {
        $scope.showPermissionError = false;
      }
    });

    $scope.$on("$routeChangeError", function (event, current, previous, rejection) {
      if (rejection.status === 403) {
        $scope.showPermissionError = true;
      }
    });

    $scope.location = String(document.location);
    $scope.version = clientConfig.version;
    $scope.newVersionAvailable = clientConfig.newVersionAvailable && currentUser.hasPermission("admin");

    $scope.newDashboard = {
      'name': null,
      'layout': null
    }
  };

  var IndexCtrl = function ($scope, Events, Dashboard, Query) {
    Events.record(currentUser, "view", "page", "personal_homepage");
    $scope.$parent.pageTitle = "Home";

    $scope.recentQueries = Query.recent();
    $scope.recentDashboards = Dashboard.recent();
  };

  // Controller for modal window share_permissions, works for both query and dashboards, needs api_access set in scope
  var SharePermissionsCtrl = function ($scope, $http, $modalInstance, User) {
      $scope.grantees = [];
      $scope.newGrantees = {};

      // List users that are granted permissions
      var loadGrantees = function() {
          $http.get($scope.api_access).success(function(result) {
          $scope.grantees = [];
          for(var access_type in result) {
            result[access_type].forEach(function(grantee) {
              var item = grantee;
              item['access_type'] = access_type;
              $scope.grantees.push(item);
            })
          }
        });
      };

      loadGrantees();

      // Search for user
      $scope.findUser = function(search) {
        if (search == "") {
          return;
        }

        if ($scope.foundUsers === undefined) {
          User.query(function(users) {
            var existingIds = _.map($scope.grantees, function(m) { return m.id; });
            _.each(users, function(user) { user.alreadyGrantee = _.contains(existingIds, user.id); });
            $scope.foundUsers = users;
          });
        }
      };

      // Add new user to grantees list
      $scope.addGrantee = function(user) {
        $scope.newGrantees.selected = undefined;
        var body = {'access_type': 'modify', 'user_id': user.id};
          $http.post($scope.api_access, body).success(function() {
          user.alreadyGrantee = true;
          loadGrantees();
        });
      };

      // Remove user from grantees list
      $scope.removeGrantee = function(user) {
        var body = {'access_type': 'modify', 'user_id': user.id};
        $http({ url: $scope.api_access, method: 'DELETE',
                data: body, headers: {"Content-Type": "application/json"}
        }).success(function() {
          $scope.grantees = _.filter($scope.grantees, function(m) {  return m != user });

          if ($scope.foundUsers) {
            _.each($scope.foundUsers, function(u) { if (u.id == user.id) { u.alreadyGrantee = false }; });
          }
        });
      };

      $scope.close = function() {
        $modalInstance.close();
      }
  };


  angular.module('redash.controllers', [])
    .controller('QueriesCtrl', ['$scope', '$http', '$location', '$filter', 'Query', QueriesCtrl])
    .controller('IndexCtrl', ['$scope', 'Events', 'Dashboard', 'Query', IndexCtrl])
    .controller('MainCtrl', ['$scope', '$location', 'Dashboard', MainCtrl])
    .controller('QuerySearchCtrl', ['$scope', '$location', '$filter', 'Events', 'Query',  QuerySearchCtrl])
    .controller('SharePermissionsCtrl', ['$scope', '$http', '$modalInstance', 'User', SharePermissionsCtrl]);
})();
