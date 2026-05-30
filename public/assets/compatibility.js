(function () {
  "use strict";

  var body = document.body;
  var viewport = document.getElementById("rekindle-viewport");
  if (!body || !viewport) {
    return;
  }

  function queryValue(name) {
    var pairs = window.location.search.replace(/^\?/, "").split("&");
    var index;

    for (index = 0; index < pairs.length; index += 1) {
      var pair = pairs[index].split("=");
      if (decodeURIComponent(pair[0]) === name) {
        return decodeURIComponent(pair[1] || "");
      }
    }

    return "";
  }

  function cookieValue(name) {
    var pairs = document.cookie.split(";");
    var index;

    for (index = 0; index < pairs.length; index += 1) {
      var pair = pairs[index].replace(/^\s+/, "").split("=");
      if (pair[0] === name) {
        return pair[1] || "";
      }
    }

    return "";
  }

  function rememberLandscapePreference(value) {
    document.cookie = "rekindleLandscape=" + value + "; path=/; max-age=31536000";
  }

  function isPortraitViewport() {
    var root = document.documentElement;
    var screen = window.screen || {};
    return (
      window.innerHeight > window.innerWidth ||
      root.clientHeight > root.clientWidth ||
      screen.height > screen.width
    );
  }

  function rotateViewport() {
    body.style.overflow = "hidden";
    viewport.style.position = "absolute";
    viewport.style.top = "0";
    viewport.style.left = window.innerWidth + "px";
    viewport.style.width = window.innerHeight + "px";
    viewport.style.height = window.innerWidth + "px";
    viewport.style.webkitTransformOrigin = "0 0";
    viewport.style.transformOrigin = "0 0";
    viewport.style.webkitTransform = "rotate(90deg)";
    viewport.style.transform = "rotate(90deg)";
  }

  function bindNavigation() {
    var elements = document.getElementsByTagName("*");
    var index;

    for (index = 0; index < elements.length; index += 1) {
      if (elements[index].getAttribute("data-href") !== null) {
        elements[index].onclick = function () {
          window.location.href = this.getAttribute("data-href");
        };
      }
    }
  }

  function showDiagnostics(shouldRotate, landscapePreference) {
    if (queryValue("diagnostics") !== "1") {
      return;
    }

    var root = document.documentElement;
    var screen = window.screen || {};
    var panel = document.createElement("pre");
    panel.style.position = "absolute";
    panel.style.top = "0";
    panel.style.left = "0";
    panel.style.zIndex = "9999";
    panel.style.margin = "0";
    panel.style.padding = "8px";
    panel.style.background = "white";
    panel.style.border = "2px solid black";
    panel.style.fontSize = "14px";
    panel.innerHTML =
      "inner: " + window.innerWidth + " x " + window.innerHeight + "\n" +
      "root: " + root.clientWidth + " x " + root.clientHeight + "\n" +
      "screen: " + screen.width + " x " + screen.height + "\n" +
      "preference: " + landscapePreference + "\n" +
      "rotate: " + shouldRotate + "\n" +
      "webkitTransform: " + ("webkitTransform" in viewport.style) + "\n" +
      "transform: " + ("transform" in viewport.style);
    body.appendChild(panel);
  }

  var landscapePreference = queryValue("landscape");
  if (landscapePreference === "1" || landscapePreference === "0") {
    rememberLandscapePreference(landscapePreference);
  } else {
    landscapePreference = cookieValue("rekindleLandscape");
  }

  var shouldRotate =
    landscapePreference === "1" ||
    (landscapePreference !== "0" && isPortraitViewport());

  if (shouldRotate) {
    rotateViewport();
  }

  bindNavigation();
  showDiagnostics(shouldRotate, landscapePreference);
}());
