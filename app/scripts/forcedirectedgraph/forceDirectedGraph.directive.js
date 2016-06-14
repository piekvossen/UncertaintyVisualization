(function() {
  'use strict';

  function forceDirectedGraphDirective() {
    return {
      restrict: 'E',
      templateUrl: 'scripts/forcedirectedgraph/forceDirectedGraph.directive.html',
      controller: 'ForceDirectedGraphController',
      controllerAs: 'fdgCtrl'
    };
  }

  angular.module('uncertApp.forcedirectedgraph').directive('forceDirectedGraphDirective', forceDirectedGraphDirective);
})();
