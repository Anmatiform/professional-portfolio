
// ============================================================
// MEP Site Tracker - Client Logic (JavaScript.html)
// ============================================================

var allGroups = [];
var allTodayKPI = {};
var allSummary = {};
var allForemen = [];
var moveGroupId = null;
var kpiGroupId = null;
var detailsGroupId = null;
var currentSystemFilter = 'all';
var currentFloorFilter  = 'all';
var currentZoneFilter   = 'all';

function productionUnit(system) { return system === 'Duct' ? 'cm²' : 'm'; }

// --- Init ---

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
  });
  document.getElementById('kpiDate').valueAsDate = new Date();
  setupFilters();
  refreshAll();
});

// --- Data loading ---

function refreshAll() {
  document.getElementById('cardGrid').innerHTML = '<div class="loading">Loading...</div>';
  demo.run
    .withSuccessHandler(function(data) {
      allGroups = data.groups;
      allTodayKPI = data.todayKPI;
      allSummary = data.summary;
      allForemen = data.foremen || [];
      renderSummary();
      renderCards();
      populateForemanDropdown();
    })
    .withFailureHandler(function(err) {
      document.getElementById('cardGrid').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠</div><p>Error loading data: ' + err.message + '</p></div>';
    })
    .getDashboardData();
}

// --- Summary ---

function renderSummary() {
  document.getElementById('sumGroups').textContent  = allSummary.totalActiveGroups;
  document.getElementById('sumWorkers').textContent  = allSummary.totalWorkers;
  document.getElementById('sumToday').textContent    = (allSummary.totalMetersToday || 0).toFixed(1) + 'm';
  document.getElementById('sumDuctToday').textContent = (allSummary.totalDuctAreaToday || 0).toFixed(1) + 'cm²';
}

// --- Filters ---

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filterType = this.dataset.filter;
      var filterVal  = this.dataset.val;

      // Toggle active class within same filter group
      var siblings = this.parentElement.querySelectorAll('.filter-btn');
      siblings.forEach(function(s) { s.classList.remove('active'); });
      this.classList.add('active');

      if (filterType === 'system') currentSystemFilter = filterVal;
      if (filterType === 'floor')  currentFloorFilter  = filterVal;
      if (filterType === 'zone')   currentZoneFilter   = filterVal;

      renderCards();
    });
  });
}

// --- Cards ---

function renderCards() {
  var filtered = allGroups.filter(function(g) {
    if (g.status !== 'Active') return false;
    if (currentSystemFilter !== 'all' && g.system !== currentSystemFilter) return false;
    if (currentFloorFilter !== 'all' && String(g.floor || '') !== currentFloorFilter) return false;
    if (currentZoneFilter !== 'all' && String(g.zone || '') !== currentZoneFilter) return false;
    return true;
  });

  // Sorted: by floor then zone
  filtered.sort(function(a, b) {
    if (a.floor !== b.floor) return parseInt(a.floor) - parseInt(b.floor);
    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
    return (a.system || '').localeCompare(b.system || '');
  });

  var totalWorkers = 0;
  var totalMeters = 0;
  var totalDuctArea = 0;
  filtered.forEach(function(g) {
    totalWorkers += Number(g.teamSize) || 0;
    if (g.system === 'Duct') totalDuctArea += Number(allTodayKPI[g.id]?.meters || 0);
    else totalMeters += Number(allTodayKPI[g.id]?.meters || 0);
  });

  document.getElementById('sumGroups').textContent = filtered.length;
  document.getElementById('sumWorkers').textContent = totalWorkers;
  document.getElementById('sumToday').textContent = totalMeters.toFixed(1) + 'm';
  document.getElementById('sumDuctToday').textContent = totalDuctArea.toFixed(1) + 'cm²';

  var statsEl = document.getElementById('filteredStats');
  if (filtered.length === 0) {
    statsEl.textContent = '';
    document.getElementById('cardGrid').innerHTML =
      '<div class="empty-state"><div class="empty-icon">📋</div><p>No groups match filters. Create a new group to get started.</p></div>';
    return;
  }

  statsEl.textContent = filtered.length + ' groups · ' + totalWorkers + ' workers · ' + totalMeters.toFixed(1) + 'm · Duct ' + totalDuctArea.toFixed(1) + 'cm² today';

  var html = '';
  filtered.forEach(function(g) {
    var kpi = allTodayKPI[g.id] || { meters: 0, notes: '' };
    var cssClass = 'system-' + (g.system || '').replace(/\s+/g, '-');
    var todayMeters = Number(kpi.meters) || 0;
    var kpiClass = todayMeters === 0 ? 'zero' : '';

    html += '<div class="card ' + cssClass + '">';
    html += '<div class="card-header">';
    html += '<span>' + (g.system || 'No System') + '</span>';
    html += '<span class="badge">F' + (g.floor || '?') + ' ' + (g.zone || '?') + '</span>';
    html += '</div>';
    html += '<div class="card-body">';
    html += '<div class="card-row"><span class="card-label">Foreman</span><span class="card-value">' + escHtml(g.foreman) + '</span></div>';
    html += '<div class="card-row"><span class="card-label">Floor / Zone</span><span class="card-value">Floor ' + (g.floor||'?') + ' · Zone ' + (g.zone||'?') + '</span></div>';
    html += '<div class="card-row"><span class="card-label">Team Size</span><span class="card-value">' + (g.teamSize||0) + ' workers</span></div>';
    html += '<div class="card-kpi"><span class="card-kpi-val ' + kpiClass + '">' + todayMeters.toFixed(1) + productionUnit(g.system) + '</span><span class="card-kpi-label">Today</span></div>';
    html += '</div>';
    html += '<div class="card-actions">';
    html += '<button class="btn btn-outline btn-sm" onclick="openMoveModal(\'' + g.id + '\',\'F' + (g.floor||'') + ' ' + (g.zone||'') + '\',\'' + (g.floor||'') + '\',\'' + (g.zone||'') + '\')">⇄ Move</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="openKPIModal(\'' + g.id + '\',\'' + escAttr(g.foreman) + ' ' + (g.system||'') + '\')">+KPI</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="editTeamSize(\'' + g.id + '\',' + (g.teamSize||0) + ')">Size</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="openDetailsModal(\'' + g.id + '\')">···</button>';
    html += '</div>';
    html += '</div>';
  });

  document.getElementById('cardGrid').innerHTML = html;
}

// --- New Group Modal ---

function openNewGroupModal() {
  document.getElementById('newForeman').value = '';
  document.getElementById('newSystem').value = '';
  document.getElementById('newFloor').value = '';
  document.getElementById('newZone').value = '';
  document.getElementById('newTeamSize').value = '';
  document.getElementById('newGroupError').style.display = 'none';
  openModal('modalNewGroup');
}

function submitNewGroup() {
  var foreman  = document.getElementById('newForeman').value.trim();
  var system   = document.getElementById('newSystem').value;
  var floor    = document.getElementById('newFloor').value;
  var zone     = document.getElementById('newZone').value;
  var teamSize = parseInt(document.getElementById('newTeamSize').value, 10);

  if (!foreman) { showError('newGroupError', 'Select a foreman'); return; }
  if (!system)  { showError('newGroupError', 'Select system type'); return; }
  if (!floor)   { showError('newGroupError', 'Select floor'); return; }
  if (!zone)    { showError('newGroupError', 'Select zone'); return; }
  if (isNaN(teamSize) || teamSize < 1 || teamSize > 30) { showError('newGroupError', 'Team size must be 1–30'); return; }

  demo.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        closeModal('modalNewGroup');
        showToast('Group ' + result.groupId + ' created');
        refreshAll();
      } else {
        showError('newGroupError', result.error);
      }
    })
    .addGroup(foreman, system, floor, zone, teamSize);
}

// --- Move Modal ---

function openMoveModal(groupId, label, currentFloor, currentZone) {
  moveGroupId = groupId;
  document.getElementById('moveGroupInfo').textContent = 'Moving: ' + label;
  document.getElementById('moveFloor').value = currentFloor || '1';
  document.getElementById('moveZone').value  = currentZone  || 'A';
  openModal('modalMove');
}

function submitMove() {
  var floor = document.getElementById('moveFloor').value;
  var zone  = document.getElementById('moveZone').value;
  demo.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        closeModal('modalMove');
        showToast('Group moved to Floor ' + floor + ' Zone ' + zone);
        refreshAll();
      }
    })
    .moveGroup(moveGroupId, floor, zone);
}

// --- KPI Modal ---

function openKPIModal(groupId, label) {
  kpiGroupId = groupId;
  var group = allGroups.find(function(g) { return g.id === groupId; });
  var unit = productionUnit(group && group.system);
  document.getElementById('kpiQuantityLabel').textContent = unit === 'cm²' ? 'Duct Area Installed (cm²)' : 'Meters Installed (m)';
  document.getElementById('kpiMeters').placeholder = unit === 'cm²' ? 'Duct area installed in cm²' : 'Meters of pipe installed';
  document.getElementById('kpiGroupInfo').textContent = 'KPI for: ' + label;
  document.getElementById('kpiDate').valueAsDate = new Date();
  document.getElementById('kpiMeters').value = '';
  document.getElementById('kpiNotes').value = '';
  document.getElementById('kpiError').style.display = 'none';
  openModal('modalKPI');
}

function submitKPI() {
  var date   = document.getElementById('kpiDate').value;
  var meters = document.getElementById('kpiMeters').value.trim();
  var notes  = document.getElementById('kpiNotes').value.trim();

  if (!date)   { showError('kpiError', 'Select a date'); return; }
  if (!meters || isNaN(parseFloat(meters)) || parseFloat(meters) < 0) {
    showError('kpiError', 'Enter valid meter value'); return;
  }

  demo.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        closeModal('modalKPI');
        showToast('KPI saved' + (result.updated ? ' (updated)' : ''));
        refreshAll();
      } else {
        showError('kpiError', result.error);
      }
    })
    .addKPI(kpiGroupId, date, Number(meters), notes);
}

// --- Details Modal ---

function openDetailsModal(groupId) {
  detailsGroupId = groupId;
  var group = null;
  for (var i = 0; i < allGroups.length; i++) {
    if (allGroups[i].id === groupId) { group = allGroups[i]; break; }
  }

  var titleEl = document.getElementById('detailsTitle');
  var summaryEl = document.getElementById('detailsSummary');
  var kpiTableBody = document.getElementById('kpiTableBody');
  var logTableBody = document.getElementById('logTableBody');
  var chartEl = document.getElementById('kpiChart');
  var deleteBtn = document.getElementById('btnDeleteGroup');
  document.getElementById('kpiHistoryQuantity').textContent = group && group.system === 'Duct' ? 'Area (cm²)' : 'Meters (m)';

  if (group) {
    titleEl.textContent = (group.foreman || '') + ' – ' + (group.system || '');
    summaryEl.innerHTML =
      '<div class="detail-chip"><strong>Floor:</strong> ' + (group.floor||'?') + '</div>' +
      '<div class="detail-chip"><strong>Zone:</strong> ' + (group.zone||'?') + '</div>' +
      '<div class="detail-chip"><strong>Team:</strong> ' + (group.teamSize||0) + ' workers</div>' +
      '<div class="detail-chip"><strong>Group ID:</strong> ' + group.id + '</div>';
    deleteBtn.style.display = 'inline-block';
  } else {
    titleEl.textContent = 'Group ' + groupId;
    summaryEl.innerHTML = '';
    deleteBtn.style.display = 'none';
  }

  document.getElementById('kpiTableBody').innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  document.getElementById('logTableBody').innerHTML   = '<tr><td colspan="3">Loading...</td></tr>';
  document.getElementById('kpiChart').innerHTML = '<div class="chart-empty">Loading...</div>';

  openModal('modalDetails');

  // Load data
  demo.run
    .withSuccessHandler(function(kpiData) {
      renderKPIHistory(kpiData, chartEl, kpiTableBody);
    })
    .getKPIsForGroup(groupId);

  demo.run
    .withSuccessHandler(function(logData) {
      renderLog(logData, logTableBody);
    })
    .getLogEntries(groupId);
}

function renderKPIHistory(kpiData, chartEl, tableBody) {
  var selectedGroup = allGroups.find(function(g) { return g.id === detailsGroupId; });
  var unit = kpiData.length ? (kpiData[0].unit || productionUnit(kpiData[0].system)) : productionUnit(selectedGroup && selectedGroup.system);
  kpiData.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
  if (kpiData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">No KPI entries yet.</td></tr>';
    chartEl.innerHTML = '<div class="chart-empty">No KPI data yet</div>';
    return;
  }

  // Bar chart
  var maxMeters = 0;
  kpiData.forEach(function(k) { if (k.meters > maxMeters) maxMeters = k.meters; });
  if (maxMeters === 0) maxMeters = 1;

  var chartHtml = '';
  kpiData.forEach(function(k) {
    var h = Math.max(4, (k.meters / maxMeters) * 100);
    var showVal = k.meters > 0 && h > 15;
    chartHtml += '<div class="chart-bar" style="height:' + h + '%;min-height:' + Math.round(h) + 'px" title="' + k.date + ': ' + k.meters + unit + '">';
    if (showVal) chartHtml += '<span class="chart-bar-val">' + k.meters + unit + '</span>';
    chartHtml += '</div>';
  });
  chartEl.innerHTML = chartHtml;

  // Table
  var totalMeters = 0;
  var html = '';
  kpiData.reverse();
  kpiData.forEach(function(k) {
    totalMeters += Number(k.meters) || 0;
    html += '<tr>';
    html += '<td>' + escHtml(k.date) + '</td>';
    html += '<td><strong>' + (k.meters||0).toFixed(1) + unit + '</strong></td>';
    html += '<td>F' + (k.floor||'?') + '</td>';
    html += '<td>' + (k.zone||'?') + '</td>';
    html += '<td>' + escHtml(k.notes || '') + '</td>';
    html += '<td><button class="btn btn-outline btn-sm" onclick="deleteKPIEntry(\'' + escAttr(k.groupId) + '\',\'' + escAttr(k.date) + '\')">×</button></td>';
    html += '</tr>';
  });
  html += '<tr style="background:#f0f2f5;font-weight:700;"><td>Total</td><td>' + totalMeters.toFixed(1) + unit + '</td><td colspan="4"></td></tr>';
  tableBody.innerHTML = html;
}

function deleteKPIEntry(groupId, dateStr) {
  if (!confirm('Delete KPI entry for ' + dateStr + '?')) return;
  demo.run
    .withSuccessHandler(function(r) {
      if (r.success) { openDetailsModal(groupId); showToast('KPI deleted'); }
    })
    .deleteKPI(groupId, dateStr);
}

function renderLog(logData, tableBody) {
  if (logData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3">No activity yet.</td></tr>';
    return;
  }
  var html = '';
  logData.forEach(function(l) {
    var ts = l.timestamp;
    if (ts instanceof Date || typeof ts === 'string' || typeof ts === 'number') {
      try {
        var d = new Date(ts);
        ts = d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      } catch(e) { ts = String(ts); }
    }
    var actionLabel = l.action || '';
    var actionClass = '';
    if (actionLabel.indexOf('KPI') >= 0) actionClass = 'kpi-action';
    else if (actionLabel.indexOf('MOVE') >= 0) actionClass = 'move-action';
    else if (actionLabel.indexOf('CREATE') >= 0) actionClass = 'create-action';
    else if (actionLabel.indexOf('DELETE') >= 0) actionClass = 'delete-action';

    html += '<tr class="' + actionClass + '">';
    html += '<td>' + ts + '</td>';
    html += '<td><span class="action-tag">' + escHtml(actionLabel) + '</span></td>';
    html += '<td>' + escHtml(l.details || '') + '</td>';
    html += '</tr>';
  });
  tableBody.innerHTML = html;
}

function confirmDeleteGroup() {
  var group = null;
  for (var i = 0; i < allGroups.length; i++) {
    if (allGroups[i].id === detailsGroupId) { group = allGroups[i]; break; }
  }
  var name = group ? group.foreman + ' – ' + group.system : detailsGroupId;
  document.getElementById('confirmMessage').textContent = 'Delete group: ' + name + '? KPI records will be preserved.';
  document.getElementById('btnConfirmYes').onclick = function() { submitDeleteGroup(); };
  openModal('modalConfirm');
}

function submitDeleteGroup() {
  demo.run
    .withSuccessHandler(function(result) {
      closeModal('modalConfirm');
      closeModal('modalDetails');
      if (result.success) { showToast('Group deleted'); refreshAll(); }
    })
    .deleteGroup(detailsGroupId);
}

// --- Modal helpers ---

function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}
// Close modals on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(function(m) { m.classList.remove('active'); });
  }
});

// --- Toast ---

function showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

// --- Error display ---

function showError(elementId, msg) {
  var el = document.getElementById(elementId);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// --- Foreman management ---

function populateForemanDropdown() {
  var sel = document.getElementById('newForeman');
  if (!sel) return;
  var val = sel.value;
  sel.innerHTML = '';
  var def = document.createElement('option');
  def.value = '';
  def.textContent = '-- Select --';
  sel.appendChild(def);
  allForemen.forEach(function(f) {
    var opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    sel.appendChild(opt);
  });
  if (val) sel.value = val;
}

function addNewForeman() {
  var name = prompt('Enter new foreman name:');
  if (!name || !name.trim()) return;
  name = name.trim();
  demo.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        demo.run.withSuccessHandler(function(data) {
          allForemen = data.foremen || [];
          populateForemanDropdown();
          document.getElementById('newForeman').value = name;
          showToast('Foreman added');
        }).getDashboardData();
      } else {
        document.getElementById('newForeman').value = name;
        showToast(result.error);
      }
    })
    .addForeman(name);
}

function editTeamSize(groupId, currentSize) {
  var newSize = prompt('Enter new team size (1-30):', currentSize);
  if (newSize === null) return;
  var n = parseInt(newSize, 10);
  if (isNaN(n) || n < 1 || n > 30) { showToast('Enter a number between 1 and 30'); return; }
  demo.run
    .withSuccessHandler(function(result) {
      if (result.success) { showToast('Team size updated'); refreshAll(); }
      else { showToast(result.error); }
    })
    .updateGroup(groupId, 'teamSize', n);
}

// --- Escaping helpers ---

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
