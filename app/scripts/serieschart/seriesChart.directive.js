(function() {
  'use strict';

  function seriesChartDirective() {
    return {
      restrict: 'E',
      templateUrl: 'scripts/serieschart/seriesChart.directive.html',
      controller: 'SeriesChartController',
      controllerAs: 'scCtrl'
    };
  }

  angular.module('uncertApp.serieschart').directive('seriesChartDirective', seriesChartDirective);
})();
