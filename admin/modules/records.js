  let pendingChart, approvedChart, dailyChart, totalChart;
  let currentMonth = new Date().getMonth() + 1;

document.addEventListener("DOMContentLoaded", async () => {
 try {
    const res = await fetch('/api/user/adminOnly', { credentials: 'include' });

    if (!res.ok) {
      console.warn("Session not found or expired, status: " + res.status);
      return;
    }

    const user = await res.json();

    const navUserName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navAvatar');
    const welcomeTitle = document.getElementById('welcomeTitle');

    // Determine avatar URL safely
    const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : '/uploads/default-avatar.png';

    if (user.pendingAdmin) {
      // Admin OTP pending
      if (navUserName) navUserName.textContent = `${user.full_name} (OTP pending)`;
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name} (OTP pending)`;
    } else {
      // Full login (user or admin)
      if (navUserName) navUserName.textContent = user.full_name || 'User/Admin';
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name || 'User/Admin'}`;
    }

  } catch (err) {
    console.error("Failed to load session info", err);
  }


  /* -----------------------------------------------
     2) SIDEBAR TOGGLE
  ------------------------------------------------ */
  const toggleBtn = document.getElementById('applicantToggle');
  const submenu = document.getElementById('applicantSubmenu');
  const arrow = document.getElementById('arrow');

  toggleBtn?.addEventListener('click', () => {
    submenu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
  });

  let currentMonth = new Date().getMonth() + 1; // ✅ declare at top
  let pendingChart, approvedChart, dailyChart, totalChart;
    // Fetch API helpers
    async function fetchMonthlyData() {
      const res = await fetch("/api/monthly-data");
      return res.json();
    }
    async function fetchDailyData(month) {
      const res = await fetch(`/api/daily-data?month=${month}`);
      return res.json();
    }

    // Create charts
    async function createCharts() {
      const monthlyData = await fetchMonthlyData();
      const dailyData = await fetchDailyData(currentMonth);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      // Pending
      pendingChart?.destroy();
      pendingChart = new Chart(document.getElementById('PendingChart'), {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Pending', data: monthlyData.pending, backgroundColor: 'rgba(59,130,246,0.7)' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, stepSize: 5 } } }
      });

      // Approved / Rejected
      approvedChart?.destroy();
      approvedChart = new Chart(document.getElementById('approvedChart'), {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: 'Approved', data: monthlyData.approved, backgroundColor: 'rgba(16,185,129,0.7)' },
            { label: 'Rejected', data: monthlyData.rejected, backgroundColor: 'rgba(239,68,68,0.7)' }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, stepSize: 5 } } }
      });

      // Daily Monitoring
      dailyChart?.destroy();
      dailyChart = new Chart(document.getElementById('dailyChart'), {
        type: 'bar',
        data: {
          labels: Array.from({ length: dailyData.length }, (_, i) => i+1),
          datasets: [{ label: 'Daily Monitoring', data: dailyData, backgroundColor: 'rgba(239,68,68,0.7)' }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, stepSize: 1 } } }
      });

      // Total Applicants
      const totalData = monthlyData.pending.map((v,i) => v + monthlyData.approved[i] + monthlyData.rejected[i]);
      totalChart?.destroy();
      totalChart = new Chart(document.getElementById('totalChart'), {
        type: 'line',
        data: { labels: months, datasets: [{ label: 'Total', data: totalData, fill: true, borderColor: 'rgba(99,102,241,1)', backgroundColor: 'rgba(99,102,241,0.25)', pointRadius: 4, borderWidth: 2 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, stepSize: 5 } } }
      });

      document.getElementById('currentMonthLabel').textContent = new Date(0, currentMonth-1).toLocaleString('default', { month: 'long' });
    }

    // Month navigation
    async function changeMonth(offset) {
      currentMonth += offset;
      if(currentMonth < 1) currentMonth = 12;
      if(currentMonth > 12) currentMonth = 1;
      const dailyData = await fetchDailyData(currentMonth);
      dailyChart.data.labels = Array.from({ length: dailyData.length }, (_, i) => i+1);
      dailyChart.data.datasets[0].data = dailyData;
      dailyChart.update();
      document.getElementById('currentMonthLabel').textContent = new Date(0, currentMonth-1).toLocaleString('default', { month: 'long' });
    }

    // Initialize charts
    await createCharts();

    // Button events
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));

    document.getElementById('downloadPendingPNG').addEventListener('click', () => downloadChart(pendingChart,'Pending','png'));
    document.getElementById('downloadPendingXLSX').addEventListener('click', () => downloadChart(pendingChart,'Pending','xlsx'));

    document.getElementById('downloadApprovedPNG').addEventListener('click', () => downloadChart(approvedChart,'ApprovedRejected','png'));
    document.getElementById('downloadApprovedXLSX').addEventListener('click', () => downloadChart(approvedChart,'ApprovedRejected','xlsx'));

    document.getElementById('downloadDailyPNG').addEventListener('click', () => downloadChart(dailyChart,'DailyMonitoring','png'));
    document.getElementById('downloadDailyXLSX').addEventListener('click', () => downloadChart(dailyChart,'DailyMonitoring','xlsx'));

    document.getElementById('downloadTotalPNG').addEventListener('click', () => downloadChart(totalChart,'TotalApplicants','png'));
    document.getElementById('downloadTotalXLSX').addEventListener('click', () => downloadChart(totalChart,'TotalApplicants','xlsx'));

    // ---------------------------
    // Download chart helper
    // ---------------------------
    window.downloadChart = function(chartInstance, fileName='chart', type='png') {
      if(!chartInstance) return;

      if(type === 'png') {
        const url = chartInstance.toBase64Image();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if(type === 'xlsx') {
        const labels = chartInstance.data.labels || [];
        const datasets = chartInstance.data.datasets || [];
        const rows = labels.map((label,i) => {
          const row = { Label: label };
          datasets.forEach(ds => row[ds.label] = ds.data[i]);
          return row;
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'ChartData');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
    };
  });