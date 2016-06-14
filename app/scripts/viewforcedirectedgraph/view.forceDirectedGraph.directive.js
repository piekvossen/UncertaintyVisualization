(function() {
  'use strict';

  function viewForceDirectedGraphDirective() {
    return {
      restrict: 'E',
      templateUrl: 'scripts/viewforcedirectedgraph/view.forceDirectedGraph.directive.html',
      controller: 'ViewForceDirectedGraphController',
      controllerAs: 'vfdgc'
    };
  }

  angular.module('uncertApp.viewforcedirectedgraph').directive('viewForceDirectedGraphDirective', viewForceDirectedGraphDirective);
})();
