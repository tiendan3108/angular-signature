/*
 * https://github.com/legalthings/signature-pad-angular
 * Copyright (c) 2015 ; Licensed MIT
 */

angular.module('signature', []);

angular.module('signature').directive('signaturePad', ['$interval', '$timeout', '$window',
  function ($interval, $timeout, $window) {
    'use strict';

    var signaturePad, element, EMPTY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAjgAAADcCAQAAADXNhPAAAACIklEQVR42u3UIQEAAAzDsM+/6UsYG0okFDQHMBIJAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMBzAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcCQADAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDkQAwHMBwAAwHMBwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMBzAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAegeayZAN3dLgwnAAAAAElFTkSuQmCC';

    return {
      restrict: 'EA',
      replace: true,
      template: '<div class="signature" style="position:relative; flex: 1;-webkit-box-flex: 1;-ms-flex: 1;"><canvas style="position: absolute;left: 0;top: 0;width: 100%;height: 100%;" ng-mouseup="onMouseup()" ng-mousedown="notifyDrawing({ drawing: true })"></canvas></div>',
      scope: {
        accept: '=?',
        clear: '=?',
        disabled: '=?',
        dataurl: '=?',
        height: '@',
        width: '@',
        notifyDrawing: '&onDrawing',
      },
      controller: [
        '$scope',
        function ($scope) {
          $scope.accept = function () {

            return {
              isEmpty: $scope.dataurl === EMPTY_IMAGE,
              dataUrl: $scope.dataurl
            };
          };

          $scope.onMouseup = function () {
            $scope.updateModel();

            // notify that drawing has ended
            $scope.notifyDrawing({ drawing: false });
          };

          $scope.updateModel = function () {
            /*
             defer handling mouseup event until $scope.signaturePad handles
             first the same event
             */
            $timeout().then(function () {
              $scope.dataurl = $scope.signaturePad.isEmpty() ? EMPTY_IMAGE : $scope.signaturePad.toDataURL();
            });
          };

          $scope.clear = function () {
            $scope.signaturePad.clear();
            $scope.dataurl = EMPTY_IMAGE;
          };

          $scope.$watch("dataurl", function (dataUrl) {
            if (!dataUrl || $scope.signaturePad.toDataURL() === dataUrl) {
              return;
            }

            $scope.setDataUrl(dataUrl);
          });
        }
      ],
      link: function (scope, element, attrs) {
        var canvas = element.find('canvas')[0];
        var parent = canvas.parentElement;
        var scale = 0;
        var ctx = canvas.getContext('2d');

        scope.signaturePad = new SignaturePad(canvas);

        scope.setDataUrl = function(dataUrl) {
          var ratio = Math.max(window.devicePixelRatio || 1, 1);

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(ratio, ratio);

          scope.signaturePad.clear();
          scope.signaturePad.fromDataURL(dataUrl);

          $timeout().then(function() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(1 / scale, 1 / scale);
          });
        };

        scope.$watch('disabled', function (val) {
            val ? scope.signaturePad.off() : scope.signaturePad.on();
        });
        
        var calculateScale = function() {

          var scaleWidth = Math.min(parent.clientWidth / canvas.clientWidth, 1);
          var scaleHeight = Math.min(parent.clientHeight / canvas.clientHeight, 1);

          var newScale = Math.min(scaleWidth, scaleHeight);

          if (newScale === scale) {
            return;
          }

          scope.signaturePad.clear();

          canvas.style.height = Math.round(parent.clientHeight) + "px";
          canvas.style.width = Math.round(parent.clientWidth) + "px";
          canvas.height = parent.clientHeight;
          canvas.width = parent.clientWidth;

          scale = newScale;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(1 / scale, 1 / scale);
        };

        var resizeIH = $interval(calculateScale, 200);
        scope.$on('$destroy', function () {
          $interval.cancel(resizeIH);
          resizeIH = null;
        });

        angular.element($window).on('resize', calculateScale);
        scope.$on('$destroy', function () {
          angular.element($window).on('resize', calculateScale);
        });

        calculateScale();

        element.on('touchstart', onTouchstart);
        element.on('touchend', onTouchend);

        function onTouchstart(event) {
          scope.$apply(function () {
            // notify that drawing has started
            scope.notifyDrawing({ drawing: true });
          });
          event.preventDefault();
        }

        function onTouchend(event) {
          scope.$apply(function () {
            // updateModel
            scope.updateModel();

            // notify that drawing has ended
            scope.notifyDrawing({ drawing: false });
          });
          event.preventDefault();
        }
      }
    };
  }
]);

// Backward compatibility
angular.module('ngSignaturePad', ['signature']);
