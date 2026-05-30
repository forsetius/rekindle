(function () {
  "use strict";

  var body = document.body;
  if (!body || window.innerHeight <= window.innerWidth) {
    return;
  }

  body.style.position = "absolute";
  body.style.top = "0";
  body.style.left = window.innerWidth + "px";
  body.style.width = window.innerHeight + "px";
  body.style.height = window.innerWidth + "px";
  body.style.webkitTransformOrigin = "0 0";
  body.style.transformOrigin = "0 0";
  body.style.webkitTransform = "rotate(90deg)";
  body.style.transform = "rotate(90deg)";
}());
