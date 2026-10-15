(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, handler) {
    const node = el("button", className || "ct-analytics-button", label);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  }

  function localDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function defaultDates() {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start: localDate(start), end: localDate(end) };
  }

  function pct(value) {
    return value === null || value === undefined ? "N/A" : Number(value).toFixed(1) + "%";
  }

  function number(value) {
    return new Intl.NumberFormat().format(Number(value || 0));
  }

  function rateValue(value) {
    return value === null || value === undefined ? null : Number(value);
  }

  function formatDiff(a, b, isRate) {
    if (a === null || a === undefined || b === null || b === undefined) return "N/A";
    const delta = Number(a) - Number(b);
    const prefix = delta > 0 ? "+" : "";
    return prefix + (isRate ? delta.toFixed(1) + " pp" : number(delta));
  }

  function fieldLabel(label, control) {
    const wrap = el("label", "ct-analytics-field");
    wrap.append(el("span", "", label), control);
    return wrap;
  }

  function statusLine(message, isError) {
    const status = el("p", "ct-analytics-status" + (isError ? " is-error" : ""), message || "");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    return status;
  }

  async function render(container) {
    container.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      container.appendChild(el("p", "ct-analytics-muted", "Analytics is available to organization Admins only."));
      return;
    }

    const dates = defaultDates();
    const page = el("section", "ct-analytics-page");
    const hero = el("header", "ct-analytics-hero");
    hero.append(
      el("p", "ct-analytics-kicker", "ORGANIZATION PERFORMANCE"),
      el("h1", "", "Team Analytics"),
      el("p", "ct-analytics-hero-copy", "Compare selected teams and review organization-wide team rankings from real work and completion records.")
    );

    const heroMeta = el("div", "ct-analytics-hero-meta");
    heroMeta.append(
      el("span", "ct-analytics-hero-chip", "Live organization data"),
      el("span", "ct-analytics-hero-chip", "Compare teams"),
      el("span", "ct-analytics-hero-chip", "Team rankings")
    );
    hero.appendChild(heroMeta);
    page.appendChild(hero);

    const toolbar = el("section", "ct-analytics-toolbar");
    const dateGrid = el("div", "ct-analytics-date-grid");
    const startDate = el("input", "ct-analytics-input");
    startDate.type = "date"; startDate.name = "start_date"; startDate.value = dates.start; startDate.required = true;
    const endDate = el("input", "ct-analytics-input");
    endDate.type = "date"; endDate.name = "end_date"; endDate.value = dates.end; endDate.required = true;
    dateGrid.append(fieldLabel("From", startDate), fieldLabel("To", endDate));
    const apply = button("Apply period", "ct-analytics-button ct-analytics-button-primary", () => loadReport());
    const exportGroup = el("div", "ct-analytics-export-group");
    const exports = [
      ["CSV", "csv"], ["Excel (.xlsx)", "xlsx"], ["PDF", "pdf"]
    ];
    const exportStatus = statusLine("");
    exports.forEach(([label, format]) => {
      exportGroup.appendChild(button("Export " + label, "ct-analytics-button ct-analytics-button-secondary", () => exportReport(format)));
    });
    const filterActions = el("div", "ct-analytics-filter-actions");
    filterActions.append(apply, exportGroup);
    toolbar.append(dateGrid, filterActions, exportStatus);
    page.appendChild(toolbar);

    const status = statusLine("Loading organization analytics…");
    page.appendChild(status);

    const summaryGrid = el("div", "ct-analytics-summary-grid");
    const summaryCards = [
      ["Teams", "team_count", "Teams in the organization"],
      ["Tasks in period", "tasks_in_period", "Team-linked work created in this period"],
      ["Completed tasks", "completed_tasks", "Currently recorded as completed"],
      ["Overdue tasks", "overdue_tasks", "Open work past its due date"]
    ];
    const summaryValues = {};
    summaryCards.forEach(([label, key, detail]) => {
      const card = el("article", "ct-analytics-summary-card");
      const top = el("div", "ct-analytics-summary-top");
      top.append(el("span", "", label), el("span", "ct-analytics-summary-dot", "•"));
      const value = el("strong", "ct-analytics-summary-value", "—");
      const note = el("p", "ct-analytics-summary-note", detail);
      card.append(top, value, note);
      summaryValues[key] = value;
      summaryGrid.appendChild(card);
    });
    page.appendChild(summaryGrid);

    const comparePanel = el("section", "ct-analytics-panel");
    const compareHeading = el("div", "ct-analytics-panel-heading");
    compareHeading.append(el("p", "ct-analytics-section-kicker", "01 / COMPARE MODE"), el("h2", "", "Team A vs Team B"),
      el("p", "ct-analytics-muted", "Choose two teams and compare the same date window. Rates are shown as percentage points in the difference column."));
    comparePanel.appendChild(compareHeading);

    const compareSelectors = el("div", "ct-analytics-compare-selectors");
    const selectA = el("select", "ct-analytics-input"); selectA.name = "team_a"; selectA.setAttribute("aria-label", "Team A");
    const selectB = el("select", "ct-analytics-input"); selectB.name = "team_b"; selectB.setAttribute("aria-label", "Team B");
    compareSelectors.append(fieldLabel("Team A", selectA), fieldLabel("Team B", selectB));
    comparePanel.appendChild(compareSelectors);
    const compareNotice = el("p", "ct-analytics-muted", "Team metrics load with the selected period.");
    comparePanel.appendChild(compareNotice);
    const chartGrid = el("div", "ct-analytics-compare-chart-grid");
    const rateChart = el("section", "ct-analytics-chart-card");
    rateChart.append(el("h3", "", "Completion rate"));
    const rateBars = el("div", "ct-analytics-bars");
    rateChart.appendChild(rateBars);
    const completedChart = el("section", "ct-analytics-chart-card");
    completedChart.append(el("h3", "", "Completed work"));
    const completedBars = el("div", "ct-analytics-bars");
    completedChart.appendChild(completedBars);
    chartGrid.append(rateChart, completedChart);
    comparePanel.appendChild(chartGrid);
    const compareTableWrap = el("div", "ct-analytics-table-wrap");
    const compareTable = el("table", "ct-analytics-table");
    compareTableWrap.appendChild(compareTable);
    comparePanel.appendChild(compareTableWrap);
    page.appendChild(comparePanel);

    const rankingsPanel = el("section", "ct-analytics-panel");
    const rankingHeading = el("div", "ct-analytics-panel-heading");
    rankingHeading.append(el("p", "ct-analytics-section-kicker", "02 / TEAM RANKINGS"), el("h2", "", "All teams"),
      el("p", "ct-analytics-muted", "Ordered by higher completion rate, then more completed tasks, then fewer overdue tasks. Teams with no tasks in this period appear at the bottom."));
    rankingsPanel.appendChild(rankingHeading);
    const rankingTableWrap = el("div", "ct-analytics-table-wrap");
    const rankingTable = el("table", "ct-analytics-table ct-analytics-ranking-table");
    rankingTableWrap.appendChild(rankingTable);
    rankingsPanel.appendChild(rankingTableWrap);
    const methodology = el("p", "ct-analytics-footnote", "Period basis: operations created during the selected date range. Completion and overdue values reflect their current recorded status. Unassigned work is excluded from team rankings.");
    rankingsPanel.appendChild(methodology);
    page.appendChild(rankingsPanel);

    container.appendChild(page);

    let report = null;
    let requestToken = 0;

    function optionValue(id) {
      const row = report && report.teams.find(item => String(item.team_id) === String(id));
      return row || null;
    }

    function fillTeamOptions(teams, previousA, previousB) {
      [selectA, selectB].forEach(select => {
        const old = select.value;
        select.replaceChildren();
        if (!teams.length) {
          const option = el("option", "", "No teams available");
          option.value = "";
          select.appendChild(option);
          select.disabled = true;
          return;
        }
        teams.forEach(team => {
          const option = el("option", "", team.team_name + (team.team_status && team.team_status.toLowerCase() !== "active" ? " (" + team.team_status + ")" : ""));
          option.value = String(team.team_id);
          select.appendChild(option);
        });
        select.disabled = false;
        if (teams.some(team => String(team.team_id) === String(old))) select.value = old;
      });
      if (teams.length) {
        if (!teams.some(team => String(team.team_id) === String(previousA))) selectA.value = String(teams[0].team_id);
        else selectA.value = String(previousA);
        const fallbackB = teams.find(team => String(team.team_id) !== String(selectA.value)) || teams[0];
        if (!teams.some(team => String(team.team_id) === String(previousB)) || String(previousB) === String(selectA.value)) {
          selectB.value = String(fallbackB.team_id);
        } else {
          selectB.value = String(previousB);
        }
      }
    }

    function metricCell(text) {
      return el("td", "", text);
    }

    function renderCompareChart(containerNode, metric, teamA, teamB, isRate) {
      containerNode.replaceChildren();
      const values = [teamA, teamB].filter(Boolean);
      const max = isRate ? 100 : Math.max(1, ...values.map(team => Number(team[metric] || 0)));
      values.forEach((team, index) => {
        const line = el("div", "ct-analytics-chart-row");
        const label = el("div", "ct-analytics-chart-label");
        label.append(el("strong", "", index === 0 ? "A · " + team.team_name : "B · " + team.team_name));
        const value = isRate ? pct(team[metric]) : number(team[metric]);
        label.append(el("span", "", value));
        const track = el("div", "ct-analytics-chart-track");
        const bar = el("span", "ct-analytics-chart-bar" + (index === 1 ? " is-secondary" : ""));
        const numeric = rateValue(team[metric]);
        bar.style.width = (numeric === null ? 0 : Math.max(0, Math.min(100, (numeric / max) * 100))) + "%";
        track.appendChild(bar);
        line.append(label, track);
        containerNode.appendChild(line);
      });
      if (!values.length) containerNode.appendChild(el("p", "ct-analytics-empty", "Select two teams to compare."));
    }

    function renderComparison() {
      const teamA = optionValue(selectA.value);
      const teamB = optionValue(selectB.value);
      rateBars.replaceChildren(); completedBars.replaceChildren(); compareTable.replaceChildren();
      if (!teamA || !teamB) {
        compareNotice.textContent = "At least one team is required to compare.";
        compareTableWrap.hidden = true;
        chartGrid.hidden = true;
        return;
      }
      if (String(teamA.team_id) === String(teamB.team_id)) {
        compareNotice.textContent = "Choose two different teams to compare.";
        compareTableWrap.hidden = true;
        chartGrid.hidden = true;
        return;
      }
      compareNotice.textContent = "Comparing " + teamA.team_name + " with " + teamB.team_name + " for " + startDate.value + " through " + endDate.value + ".";
      compareTableWrap.hidden = false;
      chartGrid.hidden = false;
      renderCompareChart(rateBars, "completion_rate", teamA, teamB, true);
      renderCompareChart(completedBars, "completed_tasks", teamA, teamB, false);

      const head = el("thead");
      const headerRow = el("tr");
      ["Metric", teamA.team_name, teamB.team_name, "A − B"].forEach(label => headerRow.appendChild(el("th", "", label)));
      head.appendChild(headerRow);
      compareTable.appendChild(head);
      const body = el("tbody");
      const metrics = [
        ["Members", "member_count", false],
        ["Tasks in period", "total_tasks", false],
        ["Completed tasks", "completed_tasks", false],
        ["Completion rate", "completion_rate", true],
        ["Open tasks", "open_tasks", false],
        ["Overdue tasks", "overdue_tasks", false],
        ["Reviewed tasks", "reviewed_tasks", false],
        ["On-time completion rate", "on_time_rate", true]
      ];
      metrics.forEach(([label, key, isRate]) => {
        const tr = el("tr");
        const a = teamA[key], b = teamB[key];
        tr.appendChild(el("th", "", label));
        tr.appendChild(metricCell(isRate ? pct(a) : number(a)));
        tr.appendChild(metricCell(isRate ? pct(b) : number(b)));
        tr.appendChild(metricCell(formatDiff(a, b, isRate)));
        body.appendChild(tr);
      });
      compareTable.appendChild(body);
    }

    function renderRankings(teams) {
      rankingTable.replaceChildren();
      const thead = el("thead");
      const trh = el("tr");
      ["Rank", "Team", "Members", "Tasks", "Completed", "Completion rate", "Open", "Overdue", "On-time rate"].forEach(label => trh.appendChild(el("th", "", label)));
      thead.appendChild(trh);
      rankingTable.appendChild(thead);
      const tbody = el("tbody");
      if (!teams.length) {
        const tr = el("tr"); const td = el("td", "ct-analytics-empty", "No teams have been created for this organization yet.");
        td.colSpan = 9; tr.appendChild(td); tbody.appendChild(tr);
      } else {
        teams.forEach(team => {
          const tr = el("tr");
          const rank = el("td", "ct-analytics-rank", "#" + team.rank);
          const nameCell = el("td", "ct-analytics-team-cell");
          nameCell.append(el("strong", "", team.team_name), el("small", "", team.team_status || "active"));
          const completion = el("td", "ct-analytics-completion-cell");
          const rate = el("div", "ct-analytics-rate-meta");
          rate.append(el("strong", "", pct(team.completion_rate)), el("span", "ct-analytics-muted", number(team.completed_tasks) + " / " + number(team.total_tasks)));
          const track = el("div", "ct-analytics-ranking-track");
          const bar = el("span", "ct-analytics-ranking-bar");
          bar.style.width = (team.completion_rate === null ? 0 : Math.max(0, Math.min(100, Number(team.completion_rate)))) + "%";
          track.appendChild(bar);
          completion.append(rate, track);
          tr.append(rank, nameCell, metricCell(number(team.member_count)), metricCell(number(team.total_tasks)), metricCell(number(team.completed_tasks)), completion, metricCell(number(team.open_tasks)), metricCell(number(team.overdue_tasks)), metricCell(pct(team.on_time_rate)));
          tbody.appendChild(tr);
        });
      }
      rankingTable.appendChild(tbody);
    }

    async function loadReport() {
      if (!startDate.value || !endDate.value) {
        status.textContent = "Choose both start and end dates.";
        status.className = "ct-analytics-status is-error";
        return;
      }
      if (startDate.value > endDate.value) {
        status.textContent = "The start date must be on or before the end date.";
        status.className = "ct-analytics-status is-error";
        return;
      }
      const thisToken = ++requestToken;
      apply.disabled = true;
      status.textContent = "Loading organization analytics…";
      status.className = "ct-analytics-status";
      exportStatus.textContent = "";
      const previousA = selectA.value;
      const previousB = selectB.value;
      try {
        const query = new URLSearchParams({ start_date: startDate.value, end_date: endDate.value });
        const data = await API.get("analytics/teams?" + query.toString());
        if (thisToken !== requestToken) return;
        report = data;
        const summary = data.summary || {};
        Object.entries(summaryValues).forEach(([key, value]) => { value.textContent = number(summary[key]); });
        fillTeamOptions(Array.isArray(data.teams) ? data.teams : [], previousA, previousB);
        renderCompareChart(rateBars, "completion_rate", optionValue(selectA.value), optionValue(selectB.value), true);
        renderComparison();
        renderRankings(Array.isArray(data.teams) ? data.teams : []);
        const period = data.period || {};
        status.textContent = "Data loaded for " + (period.start_date || startDate.value) + " through " + (period.end_date || endDate.value) +
          ". Unassigned tasks excluded from team tables: " + number(summary.unassigned_tasks) + ".";
        status.className = "ct-analytics-status is-success";
      } catch (error) {
        if (thisToken !== requestToken) return;
        report = null;
        Object.values(summaryValues).forEach(value => { value.textContent = "—"; });
        fillTeamOptions([], "", "");
        renderCompareChart(rateBars, "completion_rate", null, null, true);
        renderComparison();
        rankingTable.replaceChildren();
        status.textContent = error.message || "Could not load team analytics.";
        status.className = "ct-analytics-status is-error";
      } finally {
        if (thisToken === requestToken) apply.disabled = false;
      }
    }

    async function exportReport(format) {
      if (!report) {
        exportStatus.textContent = "Load the analytics data before exporting.";
        exportStatus.className = "ct-analytics-status is-error";
        return;
      }
      exportStatus.textContent = "Preparing " + format.toUpperCase() + " export…";
      exportStatus.className = "ct-analytics-status";
      try {
        const query = new URLSearchParams({
          format,
          start_date: startDate.value,
          end_date: endDate.value
        });
        const base = window.CleanTrackConfig && window.CleanTrackConfig.apiBaseUrl;
        if (!base) throw new Error("API configuration is unavailable.");
        const headers = new Headers({ Accept: format === "pdf" ? "application/pdf" : format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv" });
        const token = AUTH && AUTH.getAuthToken ? AUTH.getAuthToken() : "";
        if (token) headers.set("Authorization", "Bearer " + token);
        const response = await fetch(base.replace(/\/+$/, "") + "/analytics/teams/export?" + query.toString(), {
          method: "GET", headers, credentials: "include"
        });
        if (!response.ok) {
          let message = "The export request failed.";
          try { const body = await response.json(); message = body.error || body.message || message; } catch (_) {}
          throw new Error(message);
        }
        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const extension = format === "xlsx" ? "xlsx" : format;
        const filename = match ? match[1] : "cleantrack-team-rankings." + extension;
        const url = URL.createObjectURL(blob);
        const link = el("a", "");
        link.href = url; link.download = filename; link.style.display = "none";
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        exportStatus.textContent = "Export ready: " + filename;
        exportStatus.className = "ct-analytics-status is-success";
      } catch (error) {
        exportStatus.textContent = error.message || "Export failed.";
        exportStatus.className = "ct-analytics-status is-error";
      }
    }

    selectA.addEventListener("change", () => {
      if (String(selectA.value) === String(selectB.value) && report) {
        const other = report.teams.find(team => String(team.team_id) !== String(selectA.value));
        if (other) selectB.value = String(other.team_id);
      }
      renderComparison();
    });
    selectB.addEventListener("change", () => {
      if (String(selectA.value) === String(selectB.value) && report) {
        const other = report.teams.find(team => String(team.team_id) !== String(selectB.value));
        if (other) selectA.value = String(other.team_id);
      }
      renderComparison();
    });
    loadReport();
    // Rankings refresh from the backend every minute while this page is open.
    // Changing the date fields without applying them does not silently change the period.
    const refreshInterval = window.setInterval(() => {
      if (!page.isConnected) {
        window.clearInterval(refreshInterval);
        return;
      }
      if (document.visibilityState !== "hidden" && report &&
          startDate.value === report.period.start_date && endDate.value === report.period.end_date) {
        loadReport();
      }
    }, 60000);
  }

  window.CleanTrackAnalytics = Object.freeze({ render });
})();