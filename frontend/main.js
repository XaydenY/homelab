let cpuChart;
let cpuCoreCount = 0;
let refreshRate = localStorage.getItem('refreshRate') || 2;
let refreshIntervalId = null;

function startAutoRefresh() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  const ms = Number(refreshRate) * 1000;
  refreshIntervalId = setInterval(loadSystemInfo, ms);
}

function getRefreshRate() {
  return Number(refreshRate) * 1000;
}

function setRefreshRate(ms) {
  const s = Number(ms) / 1000;
  refreshRate = Number(s) || 2;
  localStorage.setItem('refreshRate', refreshRate);
  startAutoRefresh();
}

function iconImg(name, classes = '') {
  return `<img src="src/svg/${name}.svg" class="${classes}" alt="${name}">`;
}
function initCpuChart(coreCount = 1) {
  const cpuCtx = document.getElementById('cpuchart').getContext('2d');
  const colors = [
    'rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)',
    'rgba(255,206,86,1)', 'rgba(153,102,255,1)', 'rgba(255,159,64,1)',
    'rgba(100,200,100,1)', 'rgba(200,100,200,1)', 'rgba(100,100,200,1)',
    'rgba(200,200,100,1)', 'rgba(100,200,200,1)', 'rgba(200,100,100,1)'
  ];
  const datasets = [];
  for (let i = 0; i < coreCount; i++) {
    datasets.push({
      label: `Core ${i+1}`,
      data: [],
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length].replace('1)', '0.1)'),
      fill: false,
      tension: 0.3
    });
  }
  cpuChart = new Chart(cpuCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 10, font: { size: 11 } }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      elements: {
        line: { tension: 0.3, borderWidth: 2.5 },
        point: { radius: 0, hitRadius: 6 }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 }
        }
      }
    }
  });
}

function loadSystemInfo() {
  $.get('/api/system', function(data) {
    const cpu = data.cpu || "Unknown CPU";
    const cores = data.cores || "N/A";
    const ram_total = data.ram_total || "Unknown";
    const ram_used = data.ram_used || "Unknown";
    const disk = data.disk || [];
    const cpuUsageRaw = (data.cpuUsage !== undefined && data.cpuUsage !== null) ? Number(data.cpuUsage) : null;
    const cpuCores = data.cpuCores || [];
    // Compute a displayable average CPU usage when api doesn't provide avg
    let displayCpu = cpuUsageRaw;
    if (displayCpu === null) {
      if (cpuCores.length > 0) {
        const sum = cpuCores.reduce((s, v) => s + Number(v), 0);
        displayCpu = sum / cpuCores.length;
      } else {
        displayCpu = 0;
      }
    }
    displayCpu = Number(displayCpu).toFixed(1);

    let html = `<div class='flex flex-col gap-4'>`;
    html += `<div class='flex items-center gap-2'><span class='inline-block w-6 h-6 bg-accent-light rounded-full flex items-center justify-center'>${iconImg('refresh-circle','h-4 w-4')}</span><span class='font-semibold'>CPU:</span> <span>${cpu} (${cores} cores)</span></div>`;
    html += `<div class='flex items-center gap-2'><span class='inline-block w-6 h-6 bg-accent-light rounded-full flex items-center justify-center'>${iconImg('paste-clipboard','h-4 w-4')}</span><span class='font-semibold'>RAM:</span> <span>${ram_used}/${ram_total}</span></div>`;
    html += `<div class='flex flex-col gap-1'><span class='font-semibold'>Disk:</span><ul class='ml-4 text-sm'>`;
    disk.forEach(function(d) {
      html += `<li class='flex gap-2 items-center'>${iconImg('upload','w-4 h-4 mr-2 inline-block align-middle')} ${d.fs}: <span class='text-gray-700'>${d.used} / ${d.size}</span></li>`;
    });
    html += '</ul></div>';
    html += `<div class='flex items-center gap-2'><span class='font-semibold'>CPU Usage (avg):</span> <span class='text-blue-700 font-bold'>${displayCpu}%</span></div>`;
    if (cpuCores.length > 0) {
      html += `<div class='flex flex-col gap-1'><span class='font-semibold'>Per-Core Usage:</span><ul id="per-core-usage-size" class='ml-4 text-xs flex flex-wrap gap-1 max-h-16 overflow-y-auto w-56'>`;
      cpuCores.forEach(function(core, idx) {
        html += `<li class='bg-accent-lighter text-accent rounded px-1 py-0.5 whitespace-nowrap'>C${idx+1}: ${core}%</li>`;
      });
      html += '</ul></div>';
    }
    html += `</div>`;

    $('#system-info').html(html);

    // If core count changes, re-init chart
    // Ensure at least one dataset exists (fallback to avg)
    const coreLen = Math.max(1, cpuCores.length);
    if (coreLen !== cpuCoreCount) {
      cpuCoreCount = coreLen;
      if (cpuChart) cpuChart.destroy();
      initCpuChart(cpuCoreCount);
    }
    // Add new CPU usage data point for each core every 2 seconds
    const now = new Date().toLocaleTimeString();
    cpuChart.data.labels.push(now);
    if (cpuCores.length > 0) {
      cpuCores.forEach(function(core, idx) {
        cpuChart.data.datasets[idx].data.push(Number(core));
        if (cpuChart.data.datasets[idx].data.length > 30) {
          cpuChart.data.datasets[idx].data.shift();
        }
      });
    } else {
      // fallback: push avg to first dataset
      cpuChart.data.datasets[0].data.push(Number(displayCpu));
      if (cpuChart.data.datasets[0].data.length > 30) cpuChart.data.datasets[0].data.shift();
    }
    if (cpuChart.data.labels.length > 30) {
      cpuChart.data.labels.shift();
    }
    cpuChart.update();
  });
}
//sideabar navigation
function showSection(sectionId) {
    if (sectionId == 'Dashboard-section') {
        $('#Dashboard-section').show();
        $('#File-Search-section').hide();
        $('#Settings-section').hide();
        return;
    }
    if (sectionId == 'File-Search-section') {
        $('#Dashboard-section').hide();
        $('#File-Search-section').show();
        $('#Settings-section').hide();
        return;
    }
    if (sectionId == 'Settings-section') {
        $('#Dashboard-section').hide();
        $('#File-Search-section').hide();
        $('#Settings-section').show();
        return;
    }
}
// Hash-based navigation handler
function handleHashChange() {
  let hash = window.location.hash ? window.location.hash.substring(1) : '';
  if (!hash) hash = 'Dashboard-section';
  // support friendly hashes as well
  if (hash === 'dashboard') hash = 'Dashboard-section';
  if (hash === 'files' || hash === 'file-search' || hash === 'file_search') hash = 'File-Search-section';
  if (hash === 'settings') hash = 'Settings-section';
  // call existing showSection to toggle visibility
  showSection(hash);
}

window.addEventListener('hashchange', handleHashChange);
function settingsloader(){
    $('#refresh-rate').val(refreshRate);
}
function saveSettings(){ 
    const val = $('#refresh-rate').val();
    let newRate = Number(val);
    if (val === '' || isNaN(newRate) || newRate <= 0) {
      newRate = 2;
    }
    localStorage.setItem('refreshRate', newRate);
    refreshRate = newRate;
    // restart auto-refresh with new rate
    try { startAutoRefresh(); } catch (e) { /* ignore if startAutoRefresh not available */ }
}
function notify(message, duration = 3000, type = 'info') {
    const $toast = $('#toast');
    const icon = "<img src='src/svg/" + (type === 'info' ? 'bell' : 'message-alert') + ".svg' class='inline-block w-5 h-5 mr-2 align-middle' alt='" + type + "'>";
    if (type === 'info') {
      $toast.removeClass().addClass('bg-primary text-white');
    } else if (type === 'error') {
      $toast.removeClass().addClass('text-white bg-red-600');
    }
    $toast.html(icon + message).fadeIn(400);
    setTimeout(() => {
      $toast.fadeOut(400);
    }, duration);
}
$(document).ready(function() {
  settingsloader();
  initCpuChart(1); //1 core for the start 
  loadSystemInfo();
  // start automatic refresh using configured refreshRateMs
  startAutoRefresh();
  handleHashChange();
  const $rr = $('#refresh-rate');
  if ($rr.length) {
    $rr.val(getRefreshRate() / 1000);
  }
  window.saveSettings = function() {
    const raw = Number($('#refresh-rate').val());
    const secs = (Number.isFinite(raw) && raw > 0) ? raw : (getRefreshRate() / 1000);
    setRefreshRate(secs * 1000);
    $('#refresh-rate').val(getRefreshRate() / 1000);
  };
});