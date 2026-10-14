(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var group = document.querySelector(".marquee-group");
  if (group && group.parentNode && !reduceMotion) {
    var copy = group.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("button").forEach(function (button) {
      button.tabIndex = -1;
    });
    group.parentNode.appendChild(copy);
  }

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 6);
  }

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });

    document.addEventListener("click", function (event) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (toggle.contains(event.target) || nav.contains(event.target)) return;
      setNav(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
  }

  var viewer = document.querySelector("#viewer");
  var viewerImg = document.querySelector("#viewer-img");
  var viewerCap = document.querySelector("#viewer-cap");
  var marquee = document.querySelector(".marquee");
  var suppressClick = false;

  if (marquee && group) {
    var hovering = false;
    var touching = false;
    var dragging = false;
    var dragMoved = false;
    var startX = 0;
    var startScroll = 0;
    var half = 0;
    var lastTime = 0;
    var loop = !reduceMotion;

    function mod(next) {
      if (!half) return next;
      next %= half;
      if (next < 0) next += half;
      return next;
    }

    function measure() {
      half = group.offsetWidth;
      if (loop && half && marquee.scrollLeft >= half) marquee.scrollLeft -= half;
    }

    function autoOn() {
      return loop && !hovering && !touching && !dragging && !(viewer && viewer.open) && half > marquee.clientWidth;
    }

    function frame(now) {
      if (!lastTime) lastTime = now;
      var delta = Math.min(now - lastTime, 50);
      lastTime = now;
      if (autoOn()) {
        marquee.scrollLeft = mod(marquee.scrollLeft - half * (delta / 46000));
      }
      requestAnimationFrame(frame);
    }

    measure();
    window.addEventListener("resize", measure);
    if (loop) requestAnimationFrame(frame);

    marquee.addEventListener("pointerenter", function () { hovering = true; });
    marquee.addEventListener("pointerleave", function () {
      hovering = false;
      if (!dragging && !(viewer && viewer.open)) marquee.classList.remove("is-paused");
    });

    marquee.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") {
        touching = true;
        return;
      }
      if (event.button !== 0) return;
      dragging = true;
      dragMoved = false;
      startX = event.clientX;
      startScroll = marquee.scrollLeft;
      marquee.classList.add("is-dragging", "is-paused");
    });

    window.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      if (Math.abs(dx) > 6) dragMoved = true;
      marquee.scrollLeft = mod(startScroll - dx);
    });

    window.addEventListener("pointerup", function () {
      touching = false;
      if (!dragging) return;
      dragging = false;
      marquee.classList.remove("is-dragging");
      if (dragMoved) suppressClick = true;
      if (!hovering && !(viewer && viewer.open)) marquee.classList.remove("is-paused");
    });
    window.addEventListener("pointercancel", function () {
      touching = false;
      dragging = false;
      marquee.classList.remove("is-dragging");
    });

    marquee.addEventListener("scroll", function () {
      if (dragging || !loop || !half) return;
      var x = marquee.scrollLeft;
      if (x >= half) marquee.scrollLeft = x % half;
    }, { passive: true });

    marquee.addEventListener("wheel", function (event) {
      if (!half) return;
      var dx = event.deltaX;
      var dy = event.deltaY;
      if (Math.abs(dy) <= Math.abs(dx)) return;
      event.preventDefault();
      var next = marquee.scrollLeft + dy;
      marquee.scrollLeft = loop ? mod(next) : next;
    }, { passive: false });

    marquee.addEventListener("click", function (event) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (suppressClick) return;
      var img = button.querySelector("img");
      if (!viewer || !viewerImg || !img) return;
      viewerImg.src = img.currentSrc || img.src;
      viewerImg.alt = img.alt;
      if (viewerCap) viewerCap.textContent = button.getAttribute("data-view") || "";
      var names = {
        "Natural gel manicure": "natural",
        "Gel-X extensions": "gelx",
        "Gel-X fill": "fill",
        "Soak-off removal": "removal",
        "Nail art": "art"
      };
      var ids = [];
      button.querySelectorAll(".shot-line").forEach(function (line) {
        if (line.classList.contains("shot-line-total")) return;
        var name = line.querySelector("span");
        var id = name ? names[name.textContent.trim()] : "";
        if (id && ids.indexOf(id) === -1) ids.push(id);
      });
      viewer.dataset.items = ids.join(" ");
      if (typeof viewer.showModal === "function") viewer.showModal();
      if (marquee) marquee.classList.add("is-paused");
    });
  });

  if (viewer && marquee) {
    viewer.addEventListener("close", function () {
      marquee.classList.remove("is-paused");
    });
  }

  var close = document.querySelector(".viewer-close");
  if (close && viewer) {
    close.addEventListener("click", function () {
      viewer.close();
    });
  }

  if (viewer) {
    viewer.addEventListener("click", function (event) {
      var rect = viewer.getBoundingClientRect();
      var inside = event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) viewer.close();
    });
  }

  var checkout = document.querySelector("#checkout");
  var cartTab = document.querySelector(".cart-tab");
  var cartCount = document.querySelector(".cart-count");
  var shopItems = document.querySelectorAll(".shop-item");
  if (checkout && cartTab && shopItems.length) {
    var cart = {};
    var chosen = null;
    var viewMonth = new Date();
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    var pickedDay = "";
    var pickedHour = null;
    var busyMap = {};
    var busyReq = 0;
    var confirmState = null;
    var ZONE = "America/Denver";

    try {
      cart = JSON.parse(sessionStorage.getItem("nbr-cart") || "{}") || {};
    } catch (err) {
      cart = {};
    }
    try { sessionStorage.removeItem("nbr-time"); } catch (err) {}
    Object.keys(cart).forEach(function (id) {
      if (cart[id] > 0) cart[id] = 1;
      else delete cart[id];
    });

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function zonedParts(date) {
      var map = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: ZONE,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).formatToParts(date).forEach(function (part) {
        if (part.type !== "literal") map[part.type] = part.value;
      });
      return map;
    }

    function denverInstant(iso, hour) {
      var bits = iso.split("-");
      var utcGuess = Date.UTC(Number(bits[0]), Number(bits[1]) - 1, Number(bits[2]), hour, 0, 0);
      function asZoned(ms) {
        var p = zonedParts(new Date(ms));
        return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
      }
      var offset = asZoned(utcGuess) - utcGuess;
      var corrected = utcGuess - offset;
      var offset2 = asZoned(corrected) - corrected;
      return utcGuess - offset2;
    }

    function todayKey() {
      var p = zonedParts(new Date());
      return p.year + "-" + p.month + "-" + p.day;
    }

    function slotKey(iso, hour) { return iso + ":" + hour; }

    function calendarUrl() { return window.NBR_CALENDAR_URL || ""; }

    function askCalendar(query) {
      return new Promise(function (resolve, reject) {
        var url = calendarUrl();
        if (!url) {
          reject(new Error("missing"));
          return;
        }
        var name = "nbrCal" + Date.now() + Math.floor(Math.random() * 100000);
        var script = document.createElement("script");
        var timer = setTimeout(function () {
          cleanup();
          reject(new Error("timeout"));
        }, 15000);
        function cleanup() {
          clearTimeout(timer);
          try { delete window[name]; } catch (err) { window[name] = undefined; }
          if (script.parentNode) script.parentNode.removeChild(script);
        }
        window[name] = function (data) {
          cleanup();
          resolve(data);
        };
        script.onerror = function () {
          cleanup();
          reject(new Error("network"));
        };
        script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + query + "&callback=" + name;
        document.head.appendChild(script);
      });
    }

    var PROMO_CODE = "rennikaiscool";
    var promoOn = false;
    try { sessionStorage.removeItem("nbr-promo"); } catch (err) {}

    function money(n) {
      var cents = Math.round(Number(n) * 100);
      if (cents % 100 === 0) return "$" + (cents / 100);
      return "$" + (cents / 100).toFixed(2);
    }

    function sale(base) {
      if (!promoOn) return base;
      return Math.round(base * 80) / 100;
    }

    function itemCount() {
      var total = 0;
      Object.keys(cart).forEach(function (id) { total += cart[id] || 0; });
      return total;
    }

    function fullTotal() {
      var total = 0;
      shopItems.forEach(function (item) {
        total += (cart[item.getAttribute("data-id")] || 0) * Number(item.getAttribute("data-price"));
      });
      return total;
    }

    function orderTotal() {
      var total = 0;
      shopItems.forEach(function (item) {
        total += (cart[item.getAttribute("data-id")] || 0) * sale(Number(item.getAttribute("data-price")));
      });
      return total;
    }

    function paintDeal(container, full, discounted) {
      if (!container) return;
      var was = container.querySelector(".price-was");
      var now = container.querySelector(".price-now");
      if (!now) {
        container.textContent = money(discounted);
        return;
      }
      now.textContent = money(discounted);
      if (!was) return;
      var show = promoOn && full !== discounted;
      was.hidden = !show;
      if (show) was.textContent = money(full);
    }

    function saveCart() {
      try {
        sessionStorage.setItem("nbr-cart", JSON.stringify(cart));
      } catch (err) {}
    }

    function paintPrices() {
      shopItems.forEach(function (item) {
        var base = Number(item.getAttribute("data-price"));
        var now = item.querySelector(".shop-now");
        var was = item.querySelector(".shop-was");
        if (now) now.textContent = money(sale(base));
        if (was) {
          was.hidden = !promoOn;
          was.textContent = money(base);
        }
      });
    }

    function paintCards() {
      paintPrices();
      shopItems.forEach(function (item) {
        var qty = cart[item.getAttribute("data-id")] || 0;
        var state = item.querySelector(".shop-state");
        item.classList.toggle("is-selected", qty > 0);
        item.setAttribute("aria-pressed", qty > 0 ? "true" : "false");
        if (state) state.textContent = qty ? "Selected" : "Tap to add";
      });
      var count = itemCount();
      cartCount.textContent = count ? String(count) : "";
      cartTab.setAttribute("aria-label", count ? "Checkout, " + count + (count === 1 ? " item" : " items") : "Checkout");
      var finalize = document.querySelector("#finalize");
      if (finalize) {
        finalize.disabled = count === 0;
        finalize.textContent = count ? "Finalize checkout · " + money(orderTotal()) : "Finalize checkout";
      }
    }

    function showStep(step) {
      checkout.querySelectorAll(".checkout-step").forEach(function (section) {
        section.hidden = section.getAttribute("data-step") !== step;
      });
      var titles = { shop: "Checkout", review: "Your order", pay: "Pay with Venmo", book: "Book a time" };
      var title = document.querySelector("#checkout-title");
      if (title) title.textContent = titles[step] || "Checkout";
      var body = checkout.querySelector(".checkout-body");
      if (body) body.scrollTop = 0;
      if (step === "review") renderReview();
      if (step === "pay") renderPay();
      if (step === "book") renderBook();
    }

    function renderReview() {
      var list = checkout.querySelector(".order-list");
      var total = checkout.querySelector("#order-total");
      var time = checkout.querySelector(".order-time");
      if (!list) return;
      list.innerHTML = "";
      shopItems.forEach(function (item) {
        var id = item.getAttribute("data-id");
        var qty = cart[id] || 0;
        if (!qty) return;
        var base = Number(item.getAttribute("data-price"));
        var price = sale(base);
        var name = item.querySelector(".shop-name").textContent;
        var desc = item.querySelector(".shop-desc").textContent;
        var line = document.createElement("li");
        line.className = "order-line";
        line.innerHTML = "<div><h3></h3><p></p></div><div class=\"order-figures\"><strong><s class=\"price-was\" hidden></s><span class=\"price-now\"></span></strong><button type=\"button\"></button></div>";
        line.querySelector("h3").textContent = name;
        line.querySelector("p").textContent = desc;
        paintDeal(line.querySelector("strong"), base * qty, price * qty);
        var remove = line.querySelector("button");
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove one " + name);
        remove.addEventListener("click", function () {
          cart[id] = Math.max(0, (cart[id] || 0) - 1);
          if (!cart[id]) delete cart[id];
          saveCart();
          paintCards();
          renderReview();
        });
        list.appendChild(line);
      });
      if (!list.children.length) {
        var empty = document.createElement("li");
        empty.className = "order-line";
        empty.textContent = "Nothing in the cart yet.";
        list.appendChild(empty);
      }
      paintDeal(total, fullTotal(), orderTotal());
      if (time) {
        time.hidden = !chosen;
        time.textContent = chosen ? "Time: " + chosen.label : "";
      }
      var pay = checkout.querySelector("[data-goto='pay']");
      if (pay) pay.disabled = !chosen || itemCount() === 0;
    }

    function renderPay() {
      paintDeal(checkout.querySelector("#pay-total"), fullTotal(), orderTotal());
      var status = checkout.querySelector("#confirm-status");
      var button = checkout.querySelector("#confirm-booking");
      if (button) {
        button.disabled = !!(confirmState && confirmState.kind === "saving");
        button.textContent = "Confirm";
      }
      if (!status) return;
      if (confirmState && confirmState.text) status.textContent = confirmState.text;
      else status.textContent = chosen ? chosen.label : "";
    }

    function hourLabel(hour) {
      var suffix = hour < 12 ? "AM" : "PM";
      var hr = hour % 12;
      if (hr === 0) hr = 12;
      return hr + ":00 " + suffix;
    }

    function slotsFor(date) {
      var day = date.getDay();
      if (day === 0) return [];
      var start = day === 6 ? 8 : 17;
      var end = day === 6 ? 17 : 21;
      var slots = [];
      var now = Date.now();
      var iso = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
      for (var hour = start; hour <= end; hour++) {
        slots.push({
          hour: hour,
          past: denverInstant(iso, hour) <= now,
          busy: !!busyMap[slotKey(iso, hour)]
        });
      }
      return slots;
    }

    function dayAvailable(date) {
      var slots = slotsFor(date);
      if (!slots.length) return false;
      return slots.some(function (slot) { return !slot.past && !slot.busy; });
    }

    function renderHours() {
      var grid = checkout.querySelector("#hour-grid");
      var use = checkout.querySelector("#use-time");
      if (!grid) return;
      grid.innerHTML = "";
      if (!pickedDay) {
        if (use) use.disabled = true;
        return;
      }
      var parts = pickedDay.split("-");
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      var slots = slotsFor(date);
      if (!slots.some(function (slot) { return slot.hour === pickedHour && !slot.past && !slot.busy; })) {
        pickedHour = null;
      }
      slots.forEach(function (slot) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "hour-slot" + (pickedHour === slot.hour ? " is-selected" : "") + (slot.busy ? " is-busy" : "");
        button.textContent = hourLabel(slot.hour);
        button.disabled = slot.past || slot.busy;
        if (slot.busy) button.setAttribute("aria-label", hourLabel(slot.hour) + ", taken");
        button.setAttribute("aria-pressed", pickedHour === slot.hour ? "true" : "false");
        button.addEventListener("click", function () {
          if (slot.past || slot.busy) return;
          pickedHour = slot.hour;
          renderHours();
        });
        grid.appendChild(button);
      });
      if (use) use.disabled = pickedHour === null;
    }

    function renderMonth() {
      var grid = checkout.querySelector("#cal-grid");
      var label = checkout.querySelector("#cal-label");
      if (!grid || !label) return;
      label.textContent = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      grid.innerHTML = "";
      var year = viewMonth.getFullYear();
      var month = viewMonth.getMonth();
      var first = new Date(year, month, 1).getDay();
      var days = new Date(year, month + 1, 0).getDate();
      var today = todayKey();
      var i;
      for (i = 0; i < first; i++) {
        var blank = document.createElement("span");
        grid.appendChild(blank);
      }
      for (var day = 1; day <= days; day++) {
        var date = new Date(year, month, day);
        var key = year + "-" + pad(month + 1) + "-" + pad(day);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "cal-day" + (key === pickedDay ? " is-selected" : "");
        button.textContent = String(day);
        button.disabled = key < today || !dayAvailable(date);
        button.setAttribute("aria-pressed", key === pickedDay ? "true" : "false");
        button.addEventListener("click", function (event) {
          pickedDay = event.currentTarget.getAttribute("data-day");
          pickedHour = null;
          renderMonth();
          renderHours();
        });
        button.setAttribute("data-day", key);
        grid.appendChild(button);
      }
      var prev = checkout.querySelector("[data-month='-1']");
      if (prev) {
        var nowParts = zonedParts(new Date());
        var thisMonth = new Date(Number(nowParts.year), Number(nowParts.month) - 1, 1);
        prev.disabled = viewMonth.getTime() <= thisMonth.getTime();
      }
    }

    function loadBusy() {
      var note = checkout.querySelector("#cal-note");
      var url = calendarUrl();
      if (!url) {
        if (note) note.hidden = true;
        return;
      }
      var my = ++busyReq;
      var start = viewMonth.getFullYear() + "-" + pad(viewMonth.getMonth() + 1) + "-01";
      var endDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      var end = endDate.getFullYear() + "-" + pad(endDate.getMonth() + 1) + "-01";
      askCalendar("action=busy&start=" + start + "&end=" + end + "&t=" + Date.now())
        .then(function (data) {
          if (my !== busyReq) return;
          if (!data || !data.ok || !Array.isArray(data.busy)) throw new Error("bad");
          busyMap = {};
          data.busy.forEach(function (slot) {
            if (!slot || !slot.date || slot.hour === undefined || slot.hour === null) return;
            busyMap[slotKey(slot.date, Number(slot.hour))] = true;
          });
          if (note) note.hidden = true;
          renderMonth();
          renderHours();
        })
        .catch(function () {
          if (my !== busyReq) return;
          if (note) {
            note.hidden = false;
            note.textContent = "I couldn't check my calendar, so an open hour might already be taken.";
          }
        });
    }

    function renderBook() {
      renderMonth();
      renderHours();
      loadBusy();
    }

    var pageScrollY = 0;
    var scrollLockOn = false;

    function rememberScroll() {
      pageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    }

    function watchScroll() {
      if (!scrollLockOn) return;
      holdScroll();
      window.requestAnimationFrame(watchScroll);
    }

    function lockPageScroll() {
      rememberScroll();
      document.body.classList.add("checkout-open");
      if (!scrollLockOn) {
        scrollLockOn = true;
        window.requestAnimationFrame(watchScroll);
      }
    }

    function holdScroll() {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y === pageScrollY) return;
      var root = document.documentElement;
      var prior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, pageScrollY);
      root.style.scrollBehavior = prior;
    }

    function unlockPageScroll() {
      scrollLockOn = false;
      document.body.classList.remove("checkout-open");
      holdScroll();
    }

    function cartScroller(target) {
      var scroller = checkout.querySelector(".checkout-body");
      if (!scroller || !target || !scroller.contains(target)) return null;
      return scroller;
    }

    function blockBackgroundWheel(event) {
      if (!document.body.classList.contains("checkout-open")) return;
      var scroller = cartScroller(event.target);
      if (!scroller) {
        event.preventDefault();
        return;
      }
      var delta = event.deltaY || 0;
      var max = scroller.scrollHeight - scroller.clientHeight;
      var atTop = scroller.scrollTop <= 0;
      var atBottom = scroller.scrollTop >= max - 1;
      if ((delta < 0 && atTop) || (delta > 0 && atBottom)) event.preventDefault();
    }

    window.addEventListener("scroll", function () {
      if (!document.body.classList.contains("checkout-open")) return;
      if ((window.scrollY || document.documentElement.scrollTop || 0) !== pageScrollY) holdScroll();
    });
    document.addEventListener("keydown", function (event) {
      if (!document.body.classList.contains("checkout-open")) return;
      var keys = { ArrowDown: 1, ArrowUp: 1, PageDown: 1, PageUp: 1, Home: 1, End: 1, " ": 1 };
      if (!keys[event.key]) return;
      var tag = event.target && event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((event.key === " " || event.key === "Enter") && (tag === "BUTTON" || tag === "A")) return;
      event.preventDefault();
    });
    document.addEventListener("wheel", blockBackgroundWheel, { passive: false });
    document.addEventListener("touchmove", function (event) {
      if (!document.body.classList.contains("checkout-open")) return;
      if (cartScroller(event.target)) return;
      event.preventDefault();
    }, { passive: false });

    function openCheckout() {
      if (checkout.open) return;
      if (viewer && viewer.open) viewer.close();
      paintCards();
      showStep("shop");
      lockPageScroll();
      if (typeof checkout.showModal === "function") checkout.showModal();
      holdScroll();
    }

    cartTab.addEventListener("click", openCheckout);
    var bookNow = document.querySelector("#book-now");
    if (bookNow) bookNow.addEventListener("click", openCheckout);
    var bookSet = document.querySelector("#book-set");
    if (bookSet) bookSet.addEventListener("click", openCheckout);
    checkout.querySelector(".checkout-close").addEventListener("click", function () {
      checkout.close();
    });
    checkout.addEventListener("close", function () {
      unlockPageScroll();
    });
    checkout.addEventListener("click", function (event) {
      if (event.target === checkout) checkout.close();
    });

    shopItems.forEach(function (item) {
      item.addEventListener("click", function () {
        var id = item.getAttribute("data-id");
        if (cart[id]) delete cart[id];
        else cart[id] = 1;
        saveCart();
        paintCards();
      });
    });

    var finalize = document.querySelector("#finalize");
    if (finalize) {
      finalize.addEventListener("click", function () {
        if (!itemCount()) return;
        showStep("review");
      });
    }

    checkout.querySelectorAll("[data-goto]").forEach(function (button) {
      button.addEventListener("click", function () {
        var step = button.getAttribute("data-goto");
        if (step === "pay" && (!chosen || !itemCount())) return;
        if (step === "book" && !pickedDay && chosen && chosen.iso) {
          pickedDay = chosen.iso;
          pickedHour = chosen.hour;
          var bits = chosen.iso.split("-");
          viewMonth = new Date(Number(bits[0]), Number(bits[1]) - 1, 1);
        }
        showStep(step);
      });
    });

    checkout.querySelectorAll("[data-month]").forEach(function (button) {
      button.addEventListener("click", function () {
        var dir = Number(button.getAttribute("data-month"));
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + dir, 1);
        renderMonth();
        renderHours();
        loadBusy();
      });
    });

    var useTime = document.querySelector("#use-time");
    if (useTime) {
      useTime.addEventListener("click", function () {
        if (!pickedDay || pickedHour === null) return;
        var parts = pickedDay.split("-");
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        chosen = {
          iso: pickedDay,
          hour: pickedHour,
          label: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + " · " + hourLabel(pickedHour)
        };
        confirmState = null;
        saveCart();
        showStep("review");
      });
    }

    var confirmBtn = checkout.querySelector("#confirm-booking");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        var status = checkout.querySelector("#confirm-status");
        function say(kind, text) {
          confirmState = { kind: kind, text: text };
          if (status) status.textContent = text;
          confirmBtn.disabled = kind === "saving";
        }
        if (!chosen) {
          say("need-time", "Pick a time first, then confirm.");
          return;
        }
        if (!itemCount()) {
          say("empty", "Add a set first, then confirm.");
          return;
        }
        var key = slotKey(chosen.iso, chosen.hour);
        if (busyMap[key]) {
          say("busy", "That hour just got taken. Pick another time.");
          return;
        }
        if (!calendarUrl()) {
          say("error", "I couldn't save that on my calendar. Message me on Instagram and I'll add you.");
          return;
        }
        say("saving", "Saving this on my calendar…");
        var items = Object.keys(cart).filter(function (id) { return cart[id] > 0; }).join(",");
        askCalendar(
          "action=book&date=" + encodeURIComponent(chosen.iso) +
          "&hour=" + encodeURIComponent(String(chosen.hour)) +
          "&items=" + encodeURIComponent(items) +
          (promoOn ? "&promo=" + encodeURIComponent(PROMO_CODE) : "") +
          "&t=" + Date.now()
        ).then(function (data) {
          if (data && data.ok) {
            busyMap[key] = true;
            say("saved", "You're on my calendar for " + chosen.label + ".");
          } else if (data && data.reason === "busy") {
            busyMap[key] = true;
            say("busy", "That hour just got taken. Pick another time.");
          } else if (data && data.reason === "past") {
            say("past", "That time has already passed. Pick another one.");
          } else {
            say("error", "I couldn't save that on my calendar. Message me on Instagram and I'll add you.");
          }
        }).catch(function () {
          say("error", "I couldn't save that on my calendar. Message me on Instagram and I'll add you.");
        });
      });
    }

    function paintPromo(raw) {
      checkout.querySelectorAll(".promo-input").forEach(function (input) {
        if (promoOn) input.value = PROMO_CODE;
        else if (raw !== undefined) input.value = raw;
      });
      checkout.querySelectorAll(".promo-msg").forEach(function (msg) {
        msg.classList.remove("is-ok", "is-error");
        if (promoOn) {
          msg.textContent = "20% off is on every item.";
          msg.classList.add("is-ok");
        } else if (raw !== undefined) {
          msg.textContent = "That code doesn't work.";
          msg.classList.add("is-error");
        } else {
          msg.textContent = "";
        }
      });
    }
    function applyPromo(raw) {
      var typed = String(raw || "").trim().toLowerCase();
      promoOn = typed === PROMO_CODE;
      paintPromo(raw);
      paintCards();
      var review = checkout.querySelector("[data-step='review']");
      var pay = checkout.querySelector("[data-step='pay']");
      if (review && !review.hidden) renderReview();
      if (pay && !pay.hidden) renderPay();
    }
    paintPromo();
    checkout.querySelectorAll(".promo, .promo-review").forEach(function (form) {
      if (form.tagName !== "FORM" && !form.querySelector("form")) return;
      var target = form.tagName === "FORM" ? form : form.querySelector("form");
      if (!target) return;
      target.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = target.querySelector(".promo-input");
        applyPromo(input ? input.value : "");
      });
    });

    var viewerAdd = document.querySelector("#viewer-add");
    var cartFlying = false;
    function popCart() {
      if (reduceMotion) return;
      cartTab.classList.remove("is-pop");
      void cartTab.offsetWidth;
      cartTab.classList.add("is-pop");
      cartTab.addEventListener("animationend", function () {
        cartTab.classList.remove("is-pop");
      }, { once: true });
    }
    function flyToCart(src, from) {
      return new Promise(function (resolve) {
        if (reduceMotion || !src || !from) {
          resolve();
          return;
        }
        var flyer = document.createElement("img");
        flyer.className = "cart-flyer";
        flyer.alt = "";
        flyer.src = src;
        var size = 86;
        var startX = from.left + (from.width - size) / 2;
        var startY = from.top + (from.height - size) / 2;
        flyer.style.width = size + "px";
        flyer.style.height = size + "px";
        flyer.style.left = startX + "px";
        flyer.style.top = startY + "px";
        document.body.appendChild(flyer);
        var cartRect = cartTab.getBoundingClientRect();
        var endX = cartRect.left + cartRect.width / 2 - 16;
        var endY = cartRect.top + cartRect.height / 2 - 16;
        var dx = endX - startX;
        var dy = endY - startY;
        var lift = Math.min(-70, -Math.abs(dx) * 0.12);
        var anim = flyer.animate([
          { transform: "translate3d(0,0,0) scale(1) rotate(0deg)", opacity: 1 },
          { transform: "translate3d(" + (dx * 0.42) + "px, " + (dy * 0.2 + lift) + "px, 0) scale(0.7) rotate(-12deg)", opacity: 1, offset: 0.46 },
          { transform: "translate3d(" + dx + "px, " + dy + "px, 0) scale(0.28) rotate(8deg)", opacity: 0.9 }
        ], { duration: 740, easing: "cubic-bezier(.22,.7,.2,1)", fill: "forwards" });
        function done() {
          if (flyer.parentNode) flyer.remove();
          resolve();
        }
        anim.onfinish = done;
        anim.oncancel = done;
      });
    }
    if (viewerAdd && viewer && viewerImg) {
      viewerAdd.addEventListener("click", function (event) {
        event.stopPropagation();
        if (cartFlying) return;
        var ids = (viewer.dataset.items || "").split(" ").filter(Boolean);
        if (!ids.length) return;
        var known = {};
        shopItems.forEach(function (item) { known[item.getAttribute("data-id")] = true; });
        ids = ids.filter(function (id) { return known[id]; });
        if (!ids.length) return;
        var src = viewerImg.currentSrc || viewerImg.src;
        var from = viewerImg.getBoundingClientRect();
        cartFlying = true;
        if (viewer.open) viewer.close();
        flyToCart(src, from).then(function () {
          ids.forEach(function (id) { cart[id] = 1; });
          saveCart();
          paintCards();
          popCart();
          cartFlying = false;
        });
      });
    }

    paintCards();
  }
})();
