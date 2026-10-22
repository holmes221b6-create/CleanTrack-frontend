(function () {
  "use strict";

  const API = window.CleanTrackApi;
  let operations = [];
  let locations = [];
  let activity = [];
  let loading = false;
  let hasLoaded = false;
  let range = "weekly";
  let customFrom = "";
  let customTo = "";

  const COLORS = {
    green: "#288e74",
    blue: "#655895",
    red: "#9f4559",
    amber: "#655895",
    grid: "#252933",
    muted: "#858b9b",
    text: "#e8e7ef"
  };

  function el(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined && text !== null) item.textContent = String(text);
    return item;
  }

  function safeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function fmtDate(value, options) {
    const date = safeDate(value);
    return date ? new Intl.DateTimeFormat(undefined, options || { month: "short", day: "numeric" }).format(date) : "—";
  }

  function localKey(date) {
    return date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function dayStart(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function add(date, unit, count) {
    const value = new Date(date);
    if (unit === "day") value.setDate(value.getDate() + count);
    else if (unit === "week") value.setDate(value.getDate() + count * 7);
    else if (unit === "month") value.setMonth(value.getMonth() + count);
    else value.setMonth(value.getMonth() + count * 3);
    return value;
  }

  function weekStart(value) {
    const date = dayStart(value);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  }

  function monthStart(value) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  function quarterStart(value) {
    return new Date(value.getFullYear(), Math.floor(value.getMonth() / 3) * 3, 1);
  }

  function currentRange() {
    const today = dayStart(new Date());
    let unit = "week";
    let start;
    let end = today;
    let count = 8;

    if (range === "daily") {
      unit = "day";
      count = 7;
      start = add(today, "day", -6);
    } else if (range === "monthly") {
      unit = "month";
      count = 6;
      start = add(monthStart(today), "month", -5);
    } else if (range === "quarterly") {
      unit = "quarter";
      count = 4;
      start = add(quarterStart(today), "quarter", -3);
    } else if (range === "custom") {
      start = dayStart(safeDate(customFrom) || add(today, "day", -29));
      end = dayStart(safeDate(customTo) || today);
      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }
      const days = Math.min(366, Math.max(1, Math.floor((end - start) / 86400000) + 1));
      unit = days <= 31 ? "day" : days <= 120 ? "week" : "month";
      count = days;
    } else {
      unit = "week";
      count = 8;
      start = add(weekStart(today), "week", -7);
    }

    if (unit === "week") start = weekStart(start);
    if (unit === "month") start = monthStart(start);
    if (unit === "quarter") start = quarterStart(start);

    const buckets = [];
    for (let cursor = new Date(start), guard = 0; cursor <= end && guard < 400; cursor = add(cursor, unit, 1), guard++) {
      buckets.push(new Date(cursor));
    }
    if (!buckets.length) buckets.push(new Date(start));
    return { start, end, unit, buckets, count };
  }

  function bucketFor(value, unit) {
    const date = new Date(value);
    if (unit === "day") return dayStart(date);
    if (unit === "week") return weekStart(date);
    if (unit === "month") return monthStart(date);
    return quarterStart(date);
  }

  function bucketLabel(date, unit) {
    if (unit === "day") return fmtDate(date);
    if (unit === "week") return fmtDate(date);
    if (unit === "month") return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(date);
    return "Q" + (Math.floor(date.getMonth() / 3) + 1) + " " + date.getFullYear();
  }

  function status(task) {
    return String(task.status || "").trim().toLowerCase();
  }

  function isClosed(task) {
    return ["approved", "cancelled"].includes(status(task));
  }

  function overdue(task, now) {
    if (task.overdue === true || status(task) === "overdue") return true;
    const due = safeDate(task.due_at);
    return Boolean(due && due < now && !isClosed(task));
  }

  function workBucket(task, now) {
    if (overdue(task, now)) return "overdue";
    if (status(task) === "in progress") return "progress";
    if (isClosed(task)) return "closed";
    return "pending";
  }

  function taskDate(task) {
    return safeDate(task.due_at) || safeDate(task.created_at);
  }

  function isCompleted(task) {
    const operationStatus = status(task);
    const executionStatus = String(task.execution_status || "").trim().toLowerCase();
    // "Submitted" means the employee has finished the work and sent it for review.
    return ["submitted", "completed", "complete", "approved", "verified", "done", "closed"].includes(operationStatus) ||
      ["submitted", "completed", "complete", "approved", "verified", "done", "closed"].includes(executionStatus) ||
      Boolean(task.execution_submitted_at || task.submitted_at || task.reviewed_at);
  }

  function completionDate(task) {
    if (!isCompleted(task)) return null;
    return safeDate(task.execution_submitted_at) || safeDate(task.submitted_at) ||
      safeDate(task.reviewed_at) || safeDate(task.verified_at) ||
      safeDate(task.updated_at) || safeDate(task.created_at);
  }

  function locationFor(task) {
    return locations.find(item => String(item.id) === String(task.location_id));
  }

  function makeButton(text, className, action) {
    const button = el("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  function navigate(page) {
    if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage(page);
  }

  function kpi(label, value, hint, symbol, tone) {
    const card = el("article", "ct-dash-kpi ct-dash-kpi--" + tone);
    const top = el("div", "ct-dash-kpi-top");
    top.append(el("span", "ct-dash-kpi-label", label), el("span", "ct-dash-kpi-symbol", symbol));
    card.append(top, el("strong", "ct-dash-kpi-value", value), el("p", "ct-dash-kpi-hint", hint));
    return card;
  }

  function svg(tag, attrs) {
    const result = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([key, value]) => result.setAttribute(key, String(value)));
    return result;
  }

  function drawComplianceChart(container, rows, unit) {
    container.replaceChildren();
    const completedTotal = rows.reduce((sum, row) => sum + row.completed, 0);
    const width = 760, height = 284, left = 48, right = 16, top = 18, bottom = 42;
    const plotW = width - left - right, plotH = height - top - bottom;
    const maxValue = Math.max(1, ...rows.map(row => row.completed));
    const axisMax = maxValue <= 4 ? 4 : Math.ceil(maxValue / 4) * 4;
    const tickStep = axisMax / 4;
    const graph = svg("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": "Task completion trend, completed tasks per period" });
    for (let tick = 0; tick <= 4; tick++) {
      const value = Math.round(tick * tickStep), y = top + plotH * (1 - value / axisMax);
      graph.append(svg("line", { x1: left, y1: y, x2: width - right, y2: y, stroke: COLORS.grid, "stroke-width": 1 }));
      const label = svg("text", { x: left - 9, y: y + 4, fill: COLORS.muted, "font-size": 11, "text-anchor": "end" });
      label.textContent = String(value);
      graph.appendChild(label);
    }
    const points = rows.map((row, index) => ({ x: rows.length === 1 ? left + plotW / 2 : left + index / (rows.length - 1) * plotW, y: top + plotH * (1 - row.completed / axisMax), row }));
    if (points.length > 1) {
      const line = points.map((point, index) => (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1)).join(" ");
      graph.append(svg("path", { d: line, fill: "none", stroke: COLORS.green, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      const area = line + " L" + points[points.length - 1].x + " " + (top + plotH) + " L" + points[0].x + " " + (top + plotH) + " Z";
      graph.append(svg("path", { d: area, fill: "rgba(100,216,176,0.08)", stroke: "none" }));
      graph.insertBefore(graph.lastChild, graph.children[graph.children.length - 2]);
    }
    const tooltip = el("div", "ct-dash-chart-tooltip");
    tooltip.hidden = true;
    tooltip.setAttribute("role", "status");
    tooltip.setAttribute("aria-live", "polite");
    container.appendChild(graph);
    container.appendChild(tooltip);
    function showPointTooltip(point, dot) {
      tooltip.textContent = point.row.label + " · " + point.row.completed + " task" + (point.row.completed === 1 ? "" : "s") + " completed";
      tooltip.style.left = (point.x / width * 100) + "%";
      tooltip.style.top = (point.y / height * 100) + "%";
      tooltip.hidden = false;
      graph.querySelectorAll(".ct-dash-point--active").forEach(node => node.classList.remove("ct-dash-point--active"));
      if (dot) dot.classList.add("ct-dash-point--active");
    }
    points.forEach((point, index) => {
      const hit = svg("circle", { cx: point.x, cy: point.y, r: 13, fill: "transparent", stroke: "transparent", "stroke-width": 1, tabindex: 0, role: "button", "aria-label": point.row.label + ": " + point.row.completed + " tasks completed" });
      const dot = svg("circle", { cx: point.x, cy: point.y, r: 4, fill: "#101827", stroke: COLORS.green, "stroke-width": 2, "pointer-events": "none" });
      const tip = svg("title", {});
      tip.textContent = point.row.label + ": " + point.row.completed + " tasks completed";
      hit.appendChild(tip);
      hit.addEventListener("pointerenter", () => showPointTooltip(point, dot));
      hit.addEventListener("focus", () => showPointTooltip(point, dot));
      hit.addEventListener("click", event => {
        event.stopPropagation();
        if (!tooltip.hidden && dot.classList.contains("ct-dash-point--active")) {
          tooltip.hidden = true;
          dot.classList.remove("ct-dash-point--active");
        } else showPointTooltip(point, dot);
      });
      graph.appendChild(hit);
      graph.appendChild(dot);
      const show = points.length <= 8 || index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0;
      if (show) {
        const label = svg("text", { x: point.x, y: height - 14, fill: COLORS.muted, "font-size": 10, "text-anchor": "middle" });
        label.textContent = point.row.label;
        graph.appendChild(label);
      }
    });
    graph.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse" && !graph.contains(document.activeElement)) {
        tooltip.hidden = true;
        graph.querySelectorAll(".ct-dash-point--active").forEach(node => node.classList.remove("ct-dash-point--active"));
      }
    });
    graph.addEventListener("click", event => { if (event.target === graph) tooltip.hidden = true; });
    if (!completedTotal) container.append(el("p", "ct-dash-empty", "No tasks were submitted or completed in this selected range. Try a wider range, or check that the work has been submitted/completed in Operations."));
    container.append(el("p", "ct-dash-note", "Counts work when it is submitted for review or marked completed, using its actual submission/review timestamp where available. Tap or focus a point to see the count."));
  }

  function complianceRows() {
    const config = currentRange();
    const rows = config.buckets.map(date => ({ date, label: bucketLabel(date, config.unit), total: 0, approved: 0 }));
    const lookup = new Map(rows.map((row, index) => [localKey(row.date), index]));
    const rangeEndExclusive = add(dayStart(config.end), "day", 1);
    operations.forEach(task => {
      const date = taskDate(task);
      if (!date || date < config.start || date >= rangeEndExclusive) return;
      const index = lookup.get(localKey(bucketFor(date, config.unit)));
      if (index === undefined) return;
      rows[index].total += 1;
      if (isCompleted(task)) rows[index].approved += 1;
    });
    return rows.map(row => ({ ...row, rate: row.total ? Math.round(row.approved / row.total * 100) : 0 }));
  }

  function completionRows() {
    const config = currentRange();
    const rows = config.buckets.map(date => ({ date, label: bucketLabel(date, config.unit), completed: 0 }));
    const lookup = new Map(rows.map((row, index) => [localKey(row.date), index]));
    const rangeEndExclusive = add(dayStart(config.end), "day", 1);
    operations.forEach(task => {
      const date = completionDate(task);
      if (!date || date < config.start || date >= rangeEndExclusive) return;
      const index = lookup.get(localKey(bucketFor(date, config.unit)));
      if (index !== undefined) rows[index].completed += 1;
    });
    return rows;
  }

  function renderDonut(container, counts) {
    container.replaceChildren();
    const total = counts.progress + counts.pending + counts.overdue;
    const progress = total ? counts.progress / total * 360 : 0;
    const pending = total ? counts.pending / total * 360 : 0;
    const donut = el("div", "ct-dash-donut");
    donut.style.background = total
      ? "conic-gradient(" + COLORS.green + " 0deg " + progress + "deg, " + COLORS.blue + " " + progress + "deg " + (progress + pending) + "deg, " + COLORS.red + " " + (progress + pending) + "deg 360deg)"
      : "conic-gradient(#29374d 0deg 360deg)";
    const hole = el("div", "ct-dash-donut-hole");
    hole.append(el("strong", "", total), el("span", "", "open tasks"));
    donut.appendChild(hole);
    container.appendChild(donut);

    const legend = el("div", "ct-dash-legend");
    [
      ["In progress", counts.progress, COLORS.green],
      ["Pending", counts.pending, COLORS.blue],
      ["Overdue", counts.overdue, COLORS.red]
    ].forEach(([label, value, color]) => {
      const row = el("div", "ct-dash-legend-row");
      const name = el("span", "ct-dash-legend-name");
      const swatch = el("i", "ct-dash-swatch");
      swatch.style.background = color;
      name.append(swatch, el("span", "", label));
      row.append(name, el("strong", "", value));
      legend.appendChild(row);
    });
    container.appendChild(legend);
    if (!total) container.appendChild(el("p", "ct-dash-note", "No open tasks right now."));
  }

  function renderNeedsAction(container, now) {
    container.replaceChildren();
    const rows = operations.map(task => {
      const current = status(task);
      let priority = 99;
      let label = task.status || "Pending";
      if (overdue(task, now)) { priority = 0; label = "Overdue"; }
      else if (current === "submitted") { priority = 1; label = "Needs review"; }
      else if (current === "rejected") { priority = 2; label = "Rejected"; }
      else if (["created", "assigned", "pending"].includes(current) && !task.assigned_to_id) { priority = 3; label = "Unassigned"; }
      else if (["created", "assigned", "pending"].includes(current)) { priority = 4; label = "Pending"; }
      return { task, priority, label };
    }).filter(row => row.priority < 99).sort((a, b) => a.priority - b.priority).slice(0, 7);

    if (!rows.length) {
      container.appendChild(el("div", "ct-dash-empty", "Nothing urgent needs action. Overdue tasks and submissions awaiting review will appear here."));
      return;
    }
    rows.forEach(row => {
      const item = el("article", "ct-dash-action-row");
      item.append(el("span", "ct-dash-priority ct-dash-priority--" + (row.priority === 0 ? "danger" : row.priority <= 2 ? "warning" : "info")));
      const copy = el("div", "ct-dash-action-copy");
      copy.append(el("strong", "", row.task.title || "Untitled task"));
      const place = locationFor(row.task);
      const meta = [row.label, place && place.name, row.task.due_at ? "Due " + fmtDate(row.task.due_at) : ""].filter(Boolean).join(" · ");
      copy.append(el("p", "", meta));
      item.append(copy, makeButton("View", "ct-dash-small-button", () => navigate(row.priority === 1 ? "reviews" : "operations")));
      container.appendChild(item);
    });
  }

  function renderLocations(container, now) {
    container.replaceChildren();
    if (!locations.length) {
      container.appendChild(el("div", "ct-dash-empty", "No locations have been added to your organization yet."));
      return;
    }
    const rows = locations.map(location => {
      const tasks = operations.filter(task => String(task.location_id) === String(location.id));
      const approved = tasks.filter(task => status(task) === "approved").length;
      const closed = tasks.filter(isClosed).length;
      const late = tasks.filter(task => overdue(task, now)).length;
      return { location, total: tasks.length, approved, closed, late, rate: tasks.length ? Math.round(approved / tasks.length * 100) : 0 };
    }).sort((a, b) => b.rate - a.rate || a.late - b.late).slice(0, 8);

    rows.forEach(row => {
      const item = el("article", "ct-dash-location-row");
      const top = el("div", "ct-dash-location-top");
      const name = el("div", "ct-dash-location-name");
      name.append(el("strong", "", row.location.name || "Unnamed location"));
      name.append(el("span", "", row.total ? row.closed + " closed · " + row.late + " overdue" : "No tasks assigned"));
      top.append(name, el("strong", "ct-dash-location-rate", row.total ? row.rate + "%" : "—"));
      const track = el("div", "ct-dash-progress-track");
      const bar = el("span", "ct-dash-progress-fill");
      bar.style.width = row.rate + "%";
      track.appendChild(bar);
      item.append(top, track);
      container.appendChild(item);
    });
    container.append(el("p", "ct-dash-note", "Performance is measured as approved tasks divided by all tasks recorded for each location."));
  }

  function renderActivity(container) {
    container.replaceChildren();
    if (!activity.length) {
      container.appendChild(el("div", "ct-dash-empty", "No recent activity has been recorded yet."));
      return;
    }
    activity.slice(0, 8).forEach(log => {
      const item = el("article", "ct-dash-activity-row");
      const dot = el("span", "ct-dash-activity-dot");
      const copy = el("div", "ct-dash-activity-copy");
      const details = log.details && typeof log.details === "object" ? log.details : {};
      copy.append(el("strong", "", details.title || log.resource_type || "Organization activity"));
      copy.append(el("p", "", String(log.action || "updated").replace(/[._]/g, " ") + (details.new_status ? " · " + details.new_status : "")));
      const time = el("time", "", fmtDate(log.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
      item.append(dot, copy, time);
      container.appendChild(item);
    });
  }

  function renderKpis(container, counts) {
    const verified = operations.filter(task => status(task) === "approved").length;
    container.replaceChildren(
      kpi("Total tasks", operations.length, "Across your organization", "☷", "neutral"),
      kpi("In progress", counts.progress, "Currently being performed", "◷", "green"),
      kpi("Pending", counts.pending, "Awaiting start or assignment", "○", "blue"),
      kpi("Overdue", counts.overdue, "Requires attention", "!", "red"),
      kpi("Locations", locations.length, "Registered work locations", "⌖", "neutral"),
      kpi("Verified", verified, "Approved by a reviewer", "✓", "green")
    );
  }

  function renderReport(container, rows, now) {
    const total = operations.length;
    const counts = {
      progress: operations.filter(task => workBucket(task, now) === "progress").length,
      pending: operations.filter(task => !isClosed(task) && workBucket(task, now) === "pending").length,
      overdue: operations.filter(task => workBucket(task, now) === "overdue").length
    };
    const due = rows.reduce((sum, row) => sum + row.total, 0);
    const approved = rows.reduce((sum, row) => sum + row.approved, 0);
    const csvRows = [
      ["CleanTrack Admin Dashboard Report"],
      ["Exported at", new Date().toISOString()],
      ["Dashboard scope", "Current organization only"],
      [],
      ["Task overview", "Count"],
      ["Total tasks", total],
      ["In progress", counts.progress],
      ["Pending", counts.pending],
      ["Overdue", counts.overdue],
      ["Approved / verified", operations.filter(task => status(task) === "approved").length],
      ["Locations", locations.length],
      ["Compliance for selected period", due ? Math.round(approved / due * 100) + "%" : "No tasks due"],
      [],
      ["Tasks"],
      ["ID", "Title", "Status", "Task type", "Location", "Due at", "Created at", "Assigned user ID"]
    ];
    operations.forEach(task => csvRows.push([
      task.id, task.title, task.status, task.task_type,
      (locationFor(task) || {}).name || "", task.due_at || "", task.created_at || "", task.assigned_to_id || ""
    ]));
    csvRows.push([], ["Locations"], ["Name", "Task count", "Approved", "Overdue", "Approved percentage"]);
    locations.forEach(location => {
      const tasks = operations.filter(task => String(task.location_id) === String(location.id));
      const approvedTasks = tasks.filter(task => status(task) === "approved").length;
      const late = tasks.filter(task => overdue(task, now)).length;
      csvRows.push([location.name, tasks.length, approvedTasks, late, tasks.length ? Math.round(approvedTasks / tasks.length * 100) + "%" : ""]);
    });
    csvRows.push([], ["Recent activity"], ["Timestamp", "Action", "Resource type", "Resource ID", "Details"]);
    activity.forEach(log => csvRows.push([log.created_at, log.action, log.resource_type, log.resource_id, log.details ? JSON.stringify(log.details) : ""]));

    function cell(value) {
      let text = value === null || value === undefined ? "" : String(value);
      if (/^[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    const csv = "\uFEFF" + csvRows.map(row => row.map(cell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "cleantrack-dashboard-" + localKey(new Date()) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  function build(container) {
    container.replaceChildren();
    const root = el("section", "ct-admin-dashboard");
    const header = el("header", "ct-dash-header");
    const intro = el("div", "ct-dash-header-intro");
    intro.append(el("p", "ct-dash-eyebrow", "ORGANIZATION-WIDE OPERATIONS"));
    intro.append(el("h1", "ct-dash-title", "Admin Dashboard"));
    intro.append(el("p", "ct-dash-description", "What's happening right now across your organization."));
    const headerActions = el("div", "ct-dash-header-actions");
    const rangeLabel = el("label", "ct-dash-control-label", "Trend range");
    const rangeSelect = el("select", "ct-dash-select");
    rangeSelect.setAttribute("aria-label", "Task completion trend range");
    [
      ["daily", "Daily · last 7 days"],
      ["weekly", "Weekly · last 8 weeks"],
      ["monthly", "Monthly · last 6 months"],
      ["quarterly", "Quarterly · last 4 quarters"],
      ["custom", "Custom dates"]
    ].forEach(([value, label]) => {
      const option = el("option", "", label);
      option.value = value;
      rangeSelect.appendChild(option);
    });
    rangeSelect.value = range;
    rangeLabel.appendChild(rangeSelect);
    const refresh = makeButton("↻ Refresh", "ct-dash-refresh", () => load(container, true));
    headerActions.append(rangeLabel, refresh);
    header.append(intro, headerActions);
    root.appendChild(header);

    const error = el("div", "ct-dash-error");
    error.hidden = true;
    root.appendChild(error);

    const custom = el("div", "ct-dash-custom-controls");
    custom.hidden = range !== "custom";
    const fromLabel = el("label", "ct-dash-control-label", "From");
    const from = el("input", "ct-dash-date");
    from.type = "date";
    from.setAttribute("aria-label", "Start date");
    const toLabel = el("label", "ct-dash-control-label", "To");
    const to = el("input", "ct-dash-date");
    to.type = "date";
    to.setAttribute("aria-label", "End date");
    const today = new Date();
    customFrom = customFrom || localKey(add(today, "day", -29));
    customTo = customTo || localKey(today);
    from.value = customFrom;
    to.value = customTo;
    fromLabel.appendChild(from);
    toLabel.appendChild(to);
    const apply = makeButton("Apply dates", "ct-dash-apply", () => {
      if (!from.value || !to.value) return showError(root, "Choose both a start and end date.");
      if (from.value > to.value) return showError(root, "The start date must be before the end date.");
      customFrom = from.value;
      customTo = to.value;
      showError(root, "");
      renderSummary(root);
    });
    custom.append(fromLabel, toLabel, apply);
    root.appendChild(custom);

    const kpis = el("div", "ct-dash-kpis");
    kpis.dataset.kpis = "true";
    root.appendChild(kpis);

    const topGrid = el("div", "ct-dash-grid ct-dash-grid--top");
    const compliance = el("section", "ct-dash-panel ct-dash-compliance");
    const complianceHead = el("div", "ct-dash-panel-head");
    const complianceTitle = el("div");
    complianceTitle.append(el("p", "ct-dash-panel-kicker", "COMPLETED WORK"));
    complianceTitle.append(el("h2", "ct-dash-panel-title", "Task completion trend"));
    const rateWrap = el("div", "ct-dash-current-rate");
    rateWrap.append(el("strong", "", "—"), el("span", "", "Tasks completed"));
    rateWrap.firstChild.dataset.complianceRate = "true";
    complianceHead.append(complianceTitle, rateWrap);
    const chart = el("div", "ct-dash-chart");
    chart.dataset.complianceChart = "true";
    compliance.append(complianceHead, chart);
    topGrid.appendChild(compliance);

    const distribution = el("section", "ct-dash-panel ct-dash-distribution-panel");
    distribution.append(el("p", "ct-dash-panel-kicker", "CURRENT WORKLOAD"));
    distribution.append(el("h2", "ct-dash-panel-title", "Task distribution"));
    const donut = el("div", "ct-dash-donut-area");
    donut.dataset.donut = "true";
    distribution.appendChild(donut);
    topGrid.appendChild(distribution);
    root.appendChild(topGrid);

    const middle = el("div", "ct-dash-grid ct-dash-grid--middle");
    const needs = el("section", "ct-dash-panel");
    needs.append(el("p", "ct-dash-panel-kicker", "PRIORITY QUEUE"));
    needs.append(el("h2", "ct-dash-panel-title", "What needs action"));
    const needsList = el("div", "ct-dash-action-list");
    needsList.dataset.needsAction = "true";
    needs.appendChild(needsList);
    const perf = el("section", "ct-dash-panel");
    perf.append(el("p", "ct-dash-panel-kicker", "BY LOCATION"));
    perf.append(el("h2", "ct-dash-panel-title", "Location-based performance"));
    const locationsList = el("div", "ct-dash-location-list");
    locationsList.dataset.locations = "true";
    perf.appendChild(locationsList);
    middle.append(needs, perf);
    root.appendChild(middle);

    const activityPanel = el("section", "ct-dash-panel");
    activityPanel.append(el("p", "ct-dash-panel-kicker", "ORGANIZATION FEED"));
    activityPanel.append(el("h2", "ct-dash-panel-title", "Recent activity"));
    const activityList = el("div", "ct-dash-activity-list");
    activityList.dataset.activity = "true";
    activityPanel.appendChild(activityList);
    root.appendChild(activityPanel);

    const quick = el("section", "ct-dash-panel ct-dash-quick-panel");
    quick.append(el("p", "ct-dash-panel-kicker", "SHORTCUTS"));
    quick.append(el("h2", "ct-dash-panel-title", "Quick actions"));
    const quickGrid = el("div", "ct-dash-quick-grid");
    [
      ["＋", "Create task", "Create and assign an operation", "operations"],
      ["♙", "Manage staff", "Review staff accounts and roles", "staff"],
      ["⌖", "Manage locations", "Maintain work locations and areas", "locations"]
    ].forEach(([icon, label, hint, page]) => {
      const action = makeButton("", "ct-dash-quick-action", () => navigate(page));
      action.append(el("span", "ct-dash-quick-icon", icon));
      const copy = el("span", "ct-dash-quick-copy");
      copy.append(el("strong", "", label), el("small", "", hint));
      action.append(copy, el("span", "ct-dash-quick-arrow", "→"));
      quickGrid.appendChild(action);
    });
    const exportAction = makeButton("", "ct-dash-quick-action", () => renderReport(container, complianceRows(), new Date()));
    exportAction.append(el("span", "ct-dash-quick-icon", "⇩"));
    const exportCopy = el("span", "ct-dash-quick-copy");
    exportCopy.append(el("strong", "", "Export report"), el("small", "", "Download this dashboard as CSV"));
    exportAction.append(exportCopy, el("span", "ct-dash-quick-arrow", "→"));
    quickGrid.appendChild(exportAction);
    quick.appendChild(quickGrid);
    root.appendChild(quick);

    container.appendChild(root);

    rangeSelect.addEventListener("change", () => {
      range = rangeSelect.value;
      custom.hidden = range !== "custom";
      showError(root, "");
      renderSummary(root);
    });

    return root;
  }

  function showError(root, message) {
    const error = root.querySelector(".ct-dash-error");
    if (!error) return;
    error.textContent = message || "";
    error.hidden = !message;
  }

  function renderSummary(root) {
    const now = new Date();
    const counts = {
      progress: operations.filter(task => workBucket(task, now) === "progress").length,
      pending: operations.filter(task => !isClosed(task) && workBucket(task, now) === "pending").length,
      overdue: operations.filter(task => workBucket(task, now) === "overdue").length
    };
    renderKpis(root.querySelector("[data-kpis]"), counts);
    renderDonut(root.querySelector("[data-donut]"), counts);
    renderNeedsAction(root.querySelector("[data-needs-action]"), now);
    renderLocations(root.querySelector("[data-locations]"), now);
    renderActivity(root.querySelector("[data-activity]"));

    const rows = completionRows();
    const completed = rows.reduce((sum, row) => sum + row.completed, 0);
    const rate = root.querySelector("[data-compliance-rate]");
    if (rate) rate.textContent = String(completed);
    drawComplianceChart(root.querySelector("[data-compliance-chart]"), rows, currentRange().unit);
  }

  async function load(container, force) {
    let root = container.querySelector(".ct-admin-dashboard");
    // app.js clears #page-content on every navigation. Rebuild the dashboard
    // shell synchronously when returning to the route, even if data is cached.
    if (!root) root = build(container);

    if (loading) {
      renderSummary(root);
      return;
    }
    if (hasLoaded && !force) {
      renderSummary(root);
      return;
    }

    loading = true;
    const refresh = root.querySelector(".ct-dash-refresh");
    if (refresh) { refresh.disabled = true; refresh.textContent = "Loading…"; }
    showError(root, "");
    let loadError = "";
    try {
      if (!API) throw new Error("CleanTrack API client is unavailable.");
      const responses = await Promise.allSettled([
        API.get("operations"),
        API.get("locations"),
        API.get("operations/audit-history")
      ]);
      const errors = [];
      if (responses[0].status === "fulfilled") {
        const result = responses[0].value;
        operations = Array.isArray(result) ? result : (result.operations || []);
      } else { operations = []; errors.push("tasks"); }
      if (responses[1].status === "fulfilled") {
        const result = responses[1].value;
        locations = Array.isArray(result) ? result : (result.locations || []);
      } else { locations = []; errors.push("locations"); }
      if (responses[2].status === "fulfilled") {
        const result = responses[2].value;
        activity = Array.isArray(result) ? result : (result.audit_logs || []);
      } else { activity = []; errors.push("recent activity"); }
      hasLoaded = true;
      if (errors.length) {
        loadError = "Some dashboard data could not load (" + errors.join(", ") + "). Check the backend logs and database setup.";
      }
    } catch (error) {
      hasLoaded = false;
      loadError = error && error.message ? error.message : "Dashboard data failed to load.";
      operations = [];
      locations = [];
      activity = [];
    } finally {
      loading = false;
      // Navigation may have replaced the original root while requests were in
      // flight. Update the currently visible dashboard instead of a detached node.
      const activeRoot = document.getElementById("page-content")?.querySelector(".ct-admin-dashboard") || root;
      showError(activeRoot, loadError);
      renderSummary(activeRoot);
      const activeRefresh = activeRoot.querySelector(".ct-dash-refresh");
      if (activeRefresh) { activeRefresh.disabled = false; activeRefresh.textContent = "↻ Refresh"; }
    }
  }

  function render(container) {
    if (!container) return;
    const user = window.CleanTrackAuth && window.CleanTrackAuth.getCurrentUser();
    if (!user || String(user.role).toLowerCase() !== "admin") {
      container.replaceChildren(el("p", "ct-dash-empty", "The Dashboard is available to Admin users only."));
      return;
    }
    load(container, false);
  }

  window.CleanTrackDashboard = Object.freeze({ render, refresh: function () {
    return load(document.getElementById("page-content"), true);
  } });
})();