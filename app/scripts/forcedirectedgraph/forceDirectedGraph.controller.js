(function() {
  'use strict';

  function ForceDirectedGraphController($scope, $window, $element, d3, dc, NdxService, colorbrewer, HelperFunctions, Messagebus) {
    this.sources = {};
    var findMine = function(sources, uri) {
      var result;
      sources.forEach(function(source) {
        if (source.uri.localeCompare(uri) === 0) {
          result = source;
        }
      });
      return result;
    };

    var mentionToTxt = function(d, sources) {
      var result = [];
      var raw = d.mentions;
      raw.forEach(function(mention) {
        var uri = mention.uri[0];
        if (mention.uri[1] !== undefined) {
          console.log('unparsed mention here');
        }
        var charStart = parseInt(mention.char[0]);
        var charEnd = parseInt(mention.char[1]);

        var found = findMine(this.sources, uri);

        // var meta = raw[i+1].split('=');
        // var sentence = meta[meta.length-1];
        if (found) {
          result.push({
            charStart: charStart,
            charEnd: charEnd,
            text: found.text
          });
        }
      }.bind(this));
      var txt = '';
      result.forEach(function(phrase) {
        var pre = phrase.text.substring(phrase.charStart - 30, phrase.charStart);
        var word = phrase.text.substring(phrase.charStart, phrase.charEnd);
        var post = phrase.text.substring(phrase.charEnd, phrase.charEnd + 30);

        txt += pre + word + post + '\n';
      });
      return txt;
    }.bind(this);

    this.initializeChart = function() {
      var forceDirectedGraph = dc.forceDirectedGraph('#'+$element[0].children[0].attributes.id.value);

      //The dimension for the forceDirectedGraph. We use time for x and group for y,
      //and bin everything in the same group number and day.
      var subwayDimension = NdxService.buildDimension(function(d) {
        var time = d3.time.format('%Y%m%d').parse(d.time);

        return [time, HelperFunctions.determineUniqueActors(d)];
      });

      var subwayGroup = subwayDimension.group().reduce(
        //Add something to our temporary collection
        function(p, v) {
          //Climax score summed for all events with the same time(day) and group(number).
          p.count = p.count + 1;

          //Sum label values over all events fitting this time and group.
          if (v.labels) {
            v.labels.forEach(function(l) {
              p.labels[l] = (p.labels[l] || 0) + p.count;
            });
          } else {
            p.labels.none = (p.labels.none || 0) + p.count;
          }


          //Push mentions over all events fitting this time and group.
          v.mentions.forEach(function(m) {
            p.mentions.push(m);
          });

          return p;
        },
        //Remove something from our temporary collection, (basically do
        //everything in the add step, but then in reverse).
        function(p, v) {
          p.count = p.count - 1;

          if (v.labels) {
            v.labels.forEach(function(l) {
              p.labels[l] = (p.labels[l] || 0) - p.count;
            });
          } else {
            p.labels.none = (p.labels.none || 0) - p.count;
          }

          //Push mentions over all events fitting this time and group.
          v.mentions.forEach(function(m) {
            p.mentions.pop(m);
          });

          return p;
        },
        //Set up the inital data structure.
        function() {
          return {
            count: 0,
            labels: {},
            mentions: []
          };
        }
      );

      var uniqueActors = [];
      subwayGroup.all().map(function(d) {
        d.key[1].forEach(function(key) {
          if (uniqueActors.indexOf(key) < 0) {
            uniqueActors.push(key);
          }
        });
      });


      //Set up the
      forceDirectedGraph
      //Sizes in pixels
        .width($window.innerWidth - 8)
        .height(400)
        .margins({
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        })

      //Bind data
      .dimension(subwayDimension)
        .group(subwayGroup)

      .filterHandler(HelperFunctions.customDefaultFilterHandler.bind(forceDirectedGraph))

      //The time this chart takes to do its animations.
      .transitionDuration(1500)

      //x Axis
      .x(d3.time.scale())
        .elasticX(true)
        .xAxisPadding(100)
        .keyAccessor(function(p) {
          //The time of this event
          return p.key[0];
        })

      //y Axis
      .y(d3.scale.ordinal()
          .domain((function() {
            return uniqueActors;
          })())
        )
        .valueAccessor(function(p) {
          return p.key[1];
        })

      //Radius of the bubble
      .r(d3.scale.linear())
        .elasticRadius(true)
        .radiusValueAccessor(function(p) {
          if (p.value.count > 0) {
            return p.key[1].length;
          } else {
            return 0;
          }
        })
        .minRadius(5)
        .maxBubbleRelativeSize(0.015)

      //Labels printed just above the bubbles
      .renderLabel(true)
        .minRadiusWithLabel(0)
        .label(function(p) {
          var mostImportantLabel;
          var scoreOfMostImportantLabel = -1;
          //Get the most important label (highest climax score)
          var labels = Object.keys(p.value.labels);
          labels.forEach(function(l) {
            if (p.value.labels[l] > scoreOfMostImportantLabel) {
              mostImportantLabel = l;
              scoreOfMostImportantLabel = p.value.labels[l];
            }
          });
          return mostImportantLabel.toString(); //p.key;
        })

      //Information on hover
      .renderTitle(true)
        .title(function(p) {
          //Get the actors
          var actors = p.key[1];
          var actorString = '';
          actors.forEach(function(a) {
            actorString += a + '\n';
          });

          var labelString = '';
          var labels = Object.keys(p.value.labels);
          labels.forEach(function(l) {
            labelString += l + '\n';
          });

          var titleString = '\n---Actors-------\n' +
            actorString +
            '\n---Labels-------\n' +
            labelString +
            '\n---Mentions-----\n' +
            mentionToTxt(p.value, this.sources);
          return titleString;
        }.bind(this));

      //A hack to make the customBubbleChart filter out 0-value bubbles while determining the x-axis range
      dc.override(forceDirectedGraph, 'xAxisMin', function() {
        var min = d3.min(forceDirectedGraph.data(), function(e) {
          if (forceDirectedGraph.radiusValueAccessor()(e) > 0) {
            return forceDirectedGraph.keyAccessor()(e);
          }
        });
        return dc.utils.subtract(min, forceDirectedGraph.xAxisPadding());
      });

      dc.override(forceDirectedGraph, 'xAxisMax', function() {
        var max = d3.max(forceDirectedGraph.data(), function(e) {
          if (forceDirectedGraph.radiusValueAccessor()(e) > 0) {
            return forceDirectedGraph.keyAccessor()(e);
          }
        });
        return dc.utils.add(max, forceDirectedGraph.xAxisPadding());
      });

      //A hack to make the bubbleChart accept ordinal values on the y Axis
      dc.override(forceDirectedGraph, '_prepareYAxis', function(g) {
        this.__prepareYAxis(g);
        this.y().rangeBands([this.yAxisHeight(), 0], 0, 1);
      });

      dc.override(forceDirectedGraph, 'fadeDeselectedArea', function() {
        if (forceDirectedGraph.hasFilter()) {
          forceDirectedGraph.selectAll('g.' + forceDirectedGraph.BUBBLE_NODE_CLASS).each(function(d) {
            if (forceDirectedGraph.isSelectedNode(d)) {
              forceDirectedGraph.highlightSelected(this);
            } else {
              forceDirectedGraph.fadeDeselected(this);
            }
          });
        } else {
          forceDirectedGraph.selectAll('g.' + forceDirectedGraph.BUBBLE_NODE_CLASS).each(function() {
            forceDirectedGraph.resetHighlight(this);
          });
        }
      });

      //Disable the onClick handler for this chart
      dc.override(forceDirectedGraph, 'onClick', function() {
      });

      forceDirectedGraph.render();
    };

    Messagebus.subscribe('crossfilter ready', function() {
      this.initializeChart();
    }.bind(this));
  }

  angular.module('uncertApp.forcedirectedgraph').controller('ForceDirectedGraphController', ForceDirectedGraphController);
})();
