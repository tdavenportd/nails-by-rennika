var CALENDAR_ID = "rennikadavenport0@gmail.com";
var ZONE = "America/Denver";

var MENU = {
  natural: ["Natural gel manicure", 30],
  gelx: ["Gel-X extensions", 35],
  fill: ["Gel-X fill", 25],
  removal: ["Soak-off removal", 12],
  art: ["Nail art", 5]
};

function doGet(e) {
  var params = (e && e.parameter) || {};
  var result;
  try {
    result = params.action === "book" ? book_(params) : busy_(params);
  } catch (err) {
    result = { ok: false, reason: "error" };
  }
  var body = JSON.stringify(result);
  var callback = String(params.callback || "");
  if (/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + body + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function calendar_() {
  return CalendarApp.getCalendarById(CALENDAR_ID);
}

function pad_(n) {
  return (n < 10 ? "0" : "") + n;
}

function money_(n) {
  var cents = Math.round(Number(n) * 100);
  if (cents % 100 === 0) return "$" + (cents / 100);
  return "$" + (cents / 100).toFixed(2);
}

function parseDay_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
  return Utilities.parseDate(iso + " 00:00:00", ZONE, "yyyy-MM-dd HH:mm:ss");
}

function nextIso_(iso) {
  var parts = iso.split("-").map(function (n) { return Number(n); });
  var utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return utc.getUTCFullYear() + "-" + pad_(utc.getUTCMonth() + 1) + "-" + pad_(utc.getUTCDate());
}

function hoursForDow_(u) {
  if (u === 7) return [];
  if (u === 6) return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  return [17, 18, 19, 20, 21];
}

function slotBounds_(iso, hour) {
  var start = Utilities.parseDate(iso + " " + pad_(hour) + ":00:00", ZONE, "yyyy-MM-dd HH:mm:ss");
  return { start: start, end: new Date(start.getTime() + 60 * 60 * 1000) };
}

function isBlocking_(event) {
  try {
    if (event.getMyStatus && event.getMyStatus() === CalendarApp.GuestStatus.NO) return false;
  } catch (err) {}
  try {
    if (typeof event.getTransparency === "function" && CalendarApp.EventTransparency && event.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT) return false;
  } catch (err) {}
  return true;
}

function overlaps_(aStart, aEnd, bStart, bEnd) {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function slotTaken_(cal, bounds) {
  var events = cal.getEvents(bounds.start, bounds.end);
  for (var i = 0; i < events.length; i++) {
    if (!isBlocking_(events[i])) continue;
    if (overlaps_(bounds.start, bounds.end, events[i].getStartTime(), events[i].getEndTime())) return true;
  }
  return false;
}

function busy_(params) {
  var cal = calendar_();
  if (!cal) return { ok: false, reason: "calendar" };
  var start = parseDay_(params.start);
  var end = parseDay_(params.end);
  if (!start || !end || end.getTime() <= start.getTime()) return { ok: false, reason: "bad" };
  var cap = new Date(start.getTime() + 62 * 24 * 60 * 60 * 1000);
  if (end.getTime() > cap.getTime()) end = cap;
  var events = cal.getEvents(start, end).filter(isBlocking_);
  var slots = [];
  var iso = Utilities.formatDate(start, ZONE, "yyyy-MM-dd");
  var endIso = Utilities.formatDate(end, ZONE, "yyyy-MM-dd");
  var guard = 0;
  while (iso < endIso && guard < 70) {
    guard++;
    var day = parseDay_(iso);
    var hours = hoursForDow_(Number(Utilities.formatDate(day, ZONE, "u")));
    for (var h = 0; h < hours.length; h++) {
      var bounds = slotBounds_(iso, hours[h]);
      for (var i = 0; i < events.length; i++) {
        if (overlaps_(bounds.start, bounds.end, events[i].getStartTime(), events[i].getEndTime())) {
          slots.push({ date: iso, hour: hours[h] });
          break;
        }
      }
    }
    iso = nextIso_(iso);
  }
  return { ok: true, busy: slots };
}

function services_(raw) {
  var seen = {};
  var items = [];
  String(raw || "").split(",").forEach(function (id) {
    id = id.replace(/[^a-z]/g, "");
    if (!MENU[id] || seen[id]) return;
    seen[id] = true;
    items.push({ id: id, name: MENU[id][0], price: MENU[id][1] });
  });
  return items;
}

function book_(params) {
  var iso = String(params.date || "");
  var hour = Number(params.hour);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || hour !== Math.floor(hour)) return { ok: false, reason: "bad" };
  var bounds = slotBounds_(iso, hour);
  if (!bounds.start || isNaN(bounds.start.getTime())) return { ok: false, reason: "bad" };
  var dow = Number(Utilities.formatDate(bounds.start, ZONE, "u"));
  var wallHour = Number(Utilities.formatDate(bounds.start, ZONE, "H"));
  if (hoursForDow_(dow).indexOf(wallHour) === -1) return { ok: false, reason: "closed" };
  if (bounds.start.getTime() <= Date.now()) return { ok: false, reason: "past" };
  var latest = Date.now() + 180 * 24 * 60 * 60 * 1000;
  if (bounds.start.getTime() > latest) return { ok: false, reason: "closed" };
  var items = services_(params.items);
  if (!items.length) return { ok: false, reason: "empty" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var cal = calendar_();
    if (!cal) return { ok: false, reason: "calendar" };
    if (slotTaken_(cal, bounds)) return { ok: false, reason: "busy" };
    var promo = String(params.promo || "").trim().toLowerCase() === "rennikaiscool";
    if (promo) {
      items.forEach(function (item) { item.price = Math.round(item.price * 80) / 100; });
    }
    var lines = items.map(function (item) { return item.name + " — " + money_(item.price); });
    var total = items.reduce(function (sum, item) { return sum + item.price; }, 0);
    if (promo) lines.push("Promo code · 20% off");
    lines.push("Total: " + money_(total));
    lines.push("");
    lines.push("Booked from the nails by Rennika site.");
    var title = items.length === 1
      ? "Nail appointment · " + items[0].name
      : "Nail appointment · " + items.length + " services";
    var event = cal.createEvent(title, bounds.start, bounds.end, { description: lines.join("\n") });
    try { event.setVisibility(CalendarApp.Visibility.PRIVATE); } catch (err) {}
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
