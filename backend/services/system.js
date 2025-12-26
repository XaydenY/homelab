const si = require('systeminformation');

async function getSystemInfo() {
  const [cpu, mem, disk, load] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.currentLoad()
  ]);
  return {
    cpu: cpu.manufacturer + ' ' + cpu.brand,
    cores: cpu.cores,
    ram_total: (mem.total / 1073741824).toFixed(2) + ' GB',
    ram_used: ((mem.total - mem.available) / 1073741824).toFixed(2) + ' GB',
    disk: disk.map(d => ({
      fs: d.fs,
      size: (d.size / 1073741824).toFixed(2) + ' GB',
      used: (d.used / 1073741824).toFixed(2) + ' GB'
    })),
    cpuUsage: (load && typeof load.currentload === 'number') ? load.currentload.toFixed(1) : null, // average percent
    cpuCores: Array.isArray(load.cpus) ? load.cpus.map(core => core.load.toFixed(1)) : [] // per-core percent
  };
}

module.exports = { getSystemInfo };
