(function () {
  "use strict";

  var clock = document.getElementById("dashboard-clock");
  if (!clock) {
    return;
  }

  var serverEpoch = Number(clock.getAttribute("data-server-epoch"));
  var initialHours = Number(clock.getAttribute("data-hours"));
  var initialMinutes = Number(clock.getAttribute("data-minutes"));
  var loadedAt = Date.now();
  var millisecondsIntoServerMinute = ((serverEpoch % 60000) + 60000) % 60000;

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function updateClock() {
    var elapsedMinutes = Math.floor((millisecondsIntoServerMinute + Date.now() - loadedAt) / 60000);
    var minutesSinceMidnight = initialHours * 60 + initialMinutes + elapsedMinutes;
    var normalizedMinutes = ((minutesSinceMidnight % 1440) + 1440) % 1440;
    clock.innerHTML = pad(Math.floor(normalizedMinutes / 60)) + ":" + pad(normalizedMinutes % 60);
  }

  updateClock();
  window.setInterval(updateClock, 1000);
}());
