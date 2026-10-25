// Browser-only replacement for the original spreadsheet backend.
// No requests, database, authentication, or permanent storage.
// Reloading the page restores the sample data.
(function () {
  'use strict';
  const dateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const today = dateKey(new Date());
  const systems = ['Duct', 'Drainage', 'Firefighting pipe', 'Chilled water', 'Fresh water PPR', 'Chilled Fire'];
  // Supplied roster. The second G036 is assigned G037 to keep IDs unique.
  const roster = [
    ['G001', 'Fida', 'Fresh water PPR', '4', 'B', 12],
    ['G002', 'Zangir', 'Firefighting pipe', '2', 'B', 5],
    ['G003', 'Waleed', 'Firefighting pipe', '4', 'A', 12],
    ['G004', 'Fida', 'Fresh water PPR', '4', 'B', 6],
    ['G005', 'Fida', 'Fresh water PPR', '4', 'A', 8],
    ['G006', 'Fida', 'Drainage', '2', 'B', 9],
    ['G007', 'Zubair', 'Drainage', '1', 'B', 12],
    ['G008', 'Zubair', 'Fresh water PPR', '2', 'B', 11],
    ['G009', 'mostafa', 'Fresh water PPR', '2', 'B', 6],
    ['G010', 'mostafa', 'Drainage', '2', 'A', 11],
    ['G011', 'waqar', 'Duct', '2', 'B', 10],
    ['G012', 'waqar', 'Duct', '2', 'A', 12],
    ['G013', 'waqar', 'Duct', '2', 'B', 12],
    ['G014', 'Alamgir', 'Duct', '1', 'B', 7],
    ['G015', 'Alamgir', 'Duct', '1', 'B', 6],
    ['G016', 'Kalam', 'Chilled water', '3', 'B', 12],
    ['G017', 'Zishan', 'Firefighting pipe', '2', 'B', 9],
    ['G018', 'Zishan', 'Chilled water', '2', 'B', 9],
    ['G019', 'Zishan', 'Chilled water', '2', 'A', 9],
    ['G020', 'Dody', 'Firefighting pipe', '4', 'B', 5],
    ['G021', 'Taher', 'Firefighting pipe', '2', 'B', 9],
    ['G022', 'waqar', 'Duct', '4', 'A', 7],
    ['G023', 'Parvej', 'Duct', '2', 'A', 7],
    ['G024', 'Parvej', 'Duct', '2', 'A', 7],
    ['G025', 'Parvej', 'Duct', '2', 'A', 7],
    ['G026', 'Alamgir', 'Duct', '3', 'B', 7],
    ['G027', 'Alamgir', 'Duct', '3', 'B', 7],
    ['G028', 'Alamgir', 'Duct', '3', 'B', 7],
    ['G029', 'Alamgir', 'Duct', '3', 'B', 7],
    ['G030', 'Zubair', 'Fresh water PPR', '1', 'B', 8],
    ['G031', 'Zubair', 'Drainage', '1', 'B', 10],
    ['G032', 'Kalam', 'Chilled water', '4', 'B', 8],
    ['G033', 'Fida', 'Drainage', '3', 'A', 8],
    ['G034', 'Fida', 'Fresh water PPR', '2', 'A', 8],
    ['G035', 'Fida', 'Fresh water PPR', '3', 'A', 8],
    ['G036', 'Fida', 'Chilled Fire', '3', 'A', 8],
    ['G037', 'Zangir', 'Chilled Fire', '1', 'A', 8]
  ];
  const groups = roster.map(([id, foreman, system, floor, zone, teamSize]) => ({ id, foreman, system, floor, zone, teamSize, status: 'Active' }));
  const names = [...new Set(groups.map(group => group.foreman))];
  let nextId = Math.max(...groups.map(group => Number(group.id.slice(1)))) + 1;
  let kpis = [];
  const logs = [];
  // Productivity remains illustrative; the user supplied roster data only.
  const alertGroupId = 'G011';
  const missingKPIGroupId = 'G004';
  const unitFor = system => system === 'Duct' ? 'cm²' : 'm';
  const weights = groups.map((group, index) => group.id === missingKPIGroupId ? 0 : (group.teamSize * 2 + 8) * [1.08, 0.94, 1.12, 1, 0.98][index % 5]);
  const linearWeight = groups.reduce((sum, group, index) => sum + (group.system === 'Duct' ? 0 : weights[index]), 0);
  const todayValues = groups.map((group, index) => group.system === 'Duct' ? (group.id === alertGroupId ? 42 : Math.round(weights[index])) : Math.floor(weights[index] / linearWeight * 552));
  // Distribute rounding remainders so the linear total is exactly 552 m.
  const remainders = groups.map((group, index) => ({ index, fraction: weights[index] / linearWeight * 552 % 1, system: group.system }))
    .filter(group => group.system !== 'Duct').sort((a, b) => b.fraction - a.fraction);
  const remaining = 552 - groups.reduce((sum, group, index) => sum + (group.system === 'Duct' ? 0 : todayValues[index]), 0);
  for (let index = 0; index < remaining; index++) todayValues[remainders[index].index]++;
  const bases = groups.map((group, index) => group.id === alertGroupId ? 60 : todayValues[index] || 24);
  const copy = value => structuredClone(value);
  const canonicalSystem = system => system === 'Chilled & Fire' ? 'Chilled Fire' : system;
  function log(action, groupId, details) {
    logs.unshift({ timestamp: new Date().toISOString(), action, groupId, details });
  }
  groups.forEach((group, index) => {
    for (let days = 6; days >= 0; days--) {
      if (group.id === missingKPIGroupId && days === 0) continue;
      const date = new Date(); date.setDate(date.getDate() - days);
      const meters = days === 0 ? todayValues[index] : bases[index] + [0, 3, -3, 2, -2, 0, 0][days];
      kpis.push({ date: dateKey(date), groupId: group.id, foreman: group.foreman, system: group.system, meters, unit: unitFor(group.system), floor: group.floor, zone: group.zone,
        notes: group.id === alertGroupId && days === 0 ? 'Demo alert: 30% below the previous 6-day average (60 cm²). Illustrative productivity data.' : 'Sample daily site record — illustrative productivity' });
    }
    log('CREATE_GROUP', group.id, 'Demo team created | ' + group.system + ' | Floor ' + group.floor + ' Zone ' + group.zone);
    if (group.id !== missingKPIGroupId) log('KPI_ADD', group.id, group.foreman + ' | ' + today + ' | ' + todayValues[index] + ' ' + unitFor(group.system));
  });
  function getSummary() {
    const active = groups.filter(group => group.status === 'Active');
    const summary = { totalActiveGroups: active.length, totalWorkers: active.reduce((sum, group) => sum + Number(group.teamSize), 0), totalMetersToday: 0, totalDuctAreaToday: 0, systemTotals: {}, floorTotals: {}, zoneTotals: {}, ductFloorTotals: {}, ductZoneTotals: {} };
    kpis.forEach(kpi => {
      const isDuct = kpi.system === 'Duct';
      if (kpi.date === today) summary[isDuct ? 'totalDuctAreaToday' : 'totalMetersToday'] += kpi.meters;
      [['systemTotals', kpi.system], [isDuct ? 'ductFloorTotals' : 'floorTotals', kpi.floor], [isDuct ? 'ductZoneTotals' : 'zoneTotals', kpi.zone]].forEach(([field, key]) => { summary[field][key] = (summary[field][key] || 0) + kpi.meters; });
    });
    return summary;
  }
  const api = {
    getDashboardData() {
      const todayKPI = {};
      kpis.filter(kpi => kpi.date === today).forEach(kpi => { todayKPI[kpi.groupId] = { meters: kpi.meters, unit: kpi.unit, notes: kpi.notes }; });
      return { groups, todayKPI, summary: getSummary(), systems, floors: ['1', '2', '3', '4'], zones: ['A', 'B'], foremen: [...names].sort() };
    },
    getGroups: () => groups,
    getSummary,
    getForemen: () => [...names].sort(),
    getKPIsForGroup: id => kpis.filter(kpi => kpi.groupId === id),
    getTodayKPI: id => kpis.find(kpi => kpi.groupId === id && kpi.date === today) || { meters: 0, notes: '' },
    getLogEntries: id => logs.filter(entry => !id || entry.groupId === id).slice(0, 100),
    addForeman(name) {
      name = String(name || '').trim();
      if (!name) return { success: false, error: 'Name required' };
      if (names.includes(name)) return { success: false, error: 'Foreman already exists' };
      names.push(name); log('FOREMAN_ADD', '', name);
      return { success: true, name };
    },
    addGroup(foreman, system, floor, zone, teamSize) {
      if (!foreman || !systems.includes(canonicalSystem(system)) || !['1','2','3','4'].includes(String(floor)) || !['A','B'].includes(zone) || !Number.isInteger(Number(teamSize)) || teamSize < 1 || teamSize > 30) return { success: false, error: 'Enter valid group details' };
      const id = 'G' + String(nextId++).padStart(3, '0');
      groups.push({ id, foreman, system: canonicalSystem(system), floor: String(floor), zone, teamSize: Number(teamSize), status: 'Active' });
      log('CREATE_GROUP', id, foreman + ' | ' + system + ' | Floor ' + floor + ' Zone ' + zone);
      return { success: true, groupId: id };
    },
    updateGroup(id, field, value) {
      const group = groups.find(item => item.id === id);
      if (!group) return { success: false, error: 'Group not found' };
      if (!['foreman','system','floor','zone','teamSize','status'].includes(field)) return { success: false, error: 'Invalid field' };
      if (field === 'teamSize' && (!Number.isInteger(Number(value)) || value < 1 || value > 30)) return { success: false, error: 'Team size must be 1–30' };
      const before = group[field]; group[field] = field === 'system' ? canonicalSystem(value) : value;
      log('UPDATE_' + field.toUpperCase(), id, before + ' → ' + group[field]);
      return { success: true };
    },
    moveGroup(id, floor, zone) {
      const group = groups.find(item => item.id === id);
      if (!group) return { success: false, error: 'Group not found' };
      if (!['1','2','3','4'].includes(String(floor)) || !['A','B'].includes(zone)) return { success: false, error: 'Invalid location' };
      log('MOVE', id, 'Floor ' + group.floor + ' Zone ' + group.zone + ' → Floor ' + floor + ' Zone ' + zone);
      group.floor = String(floor); group.zone = zone;
      return { success: true };
    },
    addKPI(id, date, meters, notes) {
      const group = groups.find(item => item.id === id);
      if (!group) return { success: false, error: 'Group not found' };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Number(meters)) || Number(meters) < 0) return { success: false, error: 'Enter a valid date and meters' };
      const old = kpis.find(item => item.groupId === id && item.date === date);
      if (old) { old.meters = Number(meters); old.notes = notes || ''; }
      else kpis.push({ date, groupId: id, foreman: group.foreman, system: group.system, unit: unitFor(group.system), floor: group.floor, zone: group.zone, meters: Number(meters), notes: notes || '' });
      log(old ? 'KPI_UPDATE' : 'KPI_ADD', id, group.foreman + ' | ' + date + ' | ' + meters + ' ' + unitFor(group.system));
      return { success: true, updated: Boolean(old) };
    },
    deleteKPI(id, date) {
      const before = kpis.length;
      kpis = kpis.filter(item => !(item.groupId === id && item.date === date));
      if (before === kpis.length) return { success: false, error: 'KPI entry not found' };
      log('KPI_DELETE', id, 'Deleted KPI for ' + date);
      return { success: true };
    },
    deleteGroup(id) {
      const index = groups.findIndex(item => item.id === id);
      if (index < 0) return { success: false, error: 'Group not found' };
      groups.splice(index, 1); log('DELETE_GROUP', id, 'Group removed; KPI records preserved');
      return { success: true };
    }
  };
  // Keep the original UI callbacks while replacing the remote service completely.
  function runner(success, failure) {
    return new Proxy({}, { get(_, method) {
      if (method === 'withSuccessHandler') return callback => runner(callback, failure);
      if (method === 'withFailureHandler') return callback => runner(success, callback);
      if (!Object.hasOwn(api, method)) return undefined;
      return (...args) => setTimeout(() => {
        try { const result = copy(api[method](...args)); if (success) success(result); }
        catch (error) { if (failure) failure(error); else console.error(error); }
      }, 80);
    } });
  }
  window.demo = { get run() { return runner(); } };
  // Reuse the original toast; no new layout or visual components.
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof window.showToast === 'function') window.showToast('Demo KPI · G011 waqar / Duct performance down 30% today');
    }, 500);
  });
})();
