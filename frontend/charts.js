// API URL 설정: URL 파라미터에서 가져오거나 기본값 사용
// 사용법: charts.html?api=http://your-backend-url/api
const getApiBaseUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const apiUrl = urlParams.get('api');
  if (apiUrl) {
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  }
  // 기본값: 현재 호스트의 5000 포트 또는 상대 경로
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  // 외부 접근 시: 같은 호스트의 /api 경로 사용 (프록시 설정 시)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

let chartInstances = {
  drybulkTrade: null,
  fleetDevelopment: null,
  indices: null
};
const REPORT_CATEGORY = 'drybulk_clarksons_drewry';

// 캐시 설정
const CACHE_DURATION = 5 * 60 * 1000; // 5분
let chartDataCache = null;
let chartCacheTimestamp = null;

// ==================== 그래프 데이터 로드 ====================
async function loadChartData() {
  // 캐시 확인
  const now = Date.now();
  if (chartDataCache && chartCacheTimestamp && (now - chartCacheTimestamp) < CACHE_DURATION) {
    console.log('Using cached chart data');
    processChartData(chartDataCache);
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/charts/data`);
    if (!response.ok) {
      throw new Error('그래프 데이터를 불러오지 못했습니다.');
    }
    
    const chartData = await response.json();
    
    // 캐시에 저장
    chartDataCache = chartData;
    chartCacheTimestamp = Date.now();
    
    // 데이터 처리
    processChartData(chartData);
  } catch (error) {
    console.error('그래프 데이터 로드 오류:', error);
    document.querySelectorAll('.loading').forEach(el => {
      el.textContent = '데이터를 불러오는 중 오류가 발생했습니다.';
      el.className = 'error';
    });
  }
}

// 그래프 데이터 처리 함수 (캐시된 데이터 사용)
function processChartData(chartData) {
    // Dry Bulk Trade 그래프
    const drybulkLoading = document.getElementById('drybulkTradeLoading');
    const drybulkCanvas = document.getElementById('drybulkTradeChart');
    if (chartData.drybulk_trade && chartData.drybulk_trade.length > 0) {
      if (drybulkLoading) drybulkLoading.style.display = 'none';
      if (drybulkCanvas) drybulkCanvas.style.display = 'block';
      initGroupChart('drybulkTradeChart', chartData.drybulk_trade, 'Dry Bulk Trade');
    } else {
      if (drybulkLoading) {
        drybulkLoading.textContent = '데이터가 없습니다.';
        drybulkLoading.className = 'error';
      }
    }
    
    // Fleet Development 그래프
    const fleetLoading = document.getElementById('fleetDevelopmentLoading');
    const fleetCanvas = document.getElementById('fleetDevelopmentChart');
    if (chartData.fleet_development && chartData.fleet_development.length > 0) {
      if (fleetLoading) fleetLoading.style.display = 'none';
      if (fleetCanvas) fleetCanvas.style.display = 'block';
      initGroupChart('fleetDevelopmentChart', chartData.fleet_development, 'Fleet Development');
    } else {
      if (fleetLoading) {
        fleetLoading.textContent = '데이터가 없습니다.';
        fleetLoading.className = 'error';
      }
    }
    
    // Indices 그래프
    const indicesLoading = document.getElementById('indicesLoading');
    const indicesCanvas = document.getElementById('indicesChart');
    if (chartData.indices && chartData.indices.length > 0) {
      if (indicesLoading) indicesLoading.style.display = 'none';
      if (indicesCanvas) indicesCanvas.style.display = 'block';
      initGroupChart('indicesChart', chartData.indices, 'Indices');
    } else {
      if (indicesLoading) {
        indicesLoading.textContent = '데이터가 없습니다.';
        indicesLoading.className = 'error';
      }
    }
}

function initGroupChart(canvasId, datasets, title) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  // 기존 차트 제거
  const chartKey = canvasId.replace('Chart', '');
  if (chartInstances[chartKey]) {
    chartInstances[chartKey].destroy();
  }
  
  // 모든 데이터셋에서 날짜와 값 추출
  const allDates = new Set();
  const datasetsConfig = [];
  const colors = ['#1e40af', '#059669', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  // 먼저 모든 날짜 수집
  datasets.forEach((dataset) => {
    const dateCol = dataset.date_column;
    dataset.data.forEach(row => {
      const dateVal = row[dateCol];
      if (dateVal) {
        allDates.add(String(dateVal));
      }
    });
  });
  
  // 날짜 정렬 (날짜 문자열을 Date 객체로 변환하여 정렬)
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  // 차트 타입 판별
  const isIndicesChart = canvasId.includes('indices');
  const isFleetChart = canvasId.includes('fleet');
  const isDrybulkChart = canvasId.includes('drybulkTrade');
  
  // 데이터셋 구성
  datasets.forEach((dataset, idx) => {
    const dateCol = dataset.date_column;
    const dataCols = dataset.columns.filter(col => col !== dateCol && col.toLowerCase().includes('date') === false);
    
    dataCols.forEach((col, colIdx) => {
      const dates = [];
      const values = [];
      
      dataset.data.forEach(row => {
        const dateVal = row[dateCol];
        const value = parseFloat(row[col]);
        
        if (dateVal && !isNaN(value)) {
          dates.push(dateVal);
          values.push(value);
        }
      });
      
      if (dates.length > 0) {
        // 날짜를 숫자로 변환 (인덱스 기반)
        const dateIndices = dates.map(date => {
          const dateStr = String(date);
          const dateIndex = sortedDates.indexOf(dateStr);
          return dateIndex !== -1 ? dateIndex : sortedDates.length;
        });
        
        // 레이블 생성
        let label = col;
        if (isIndicesChart) {
          // Indices: 파일명에서 인덱스 이름 추출
          const filename = dataset.filename || '';
          if (filename.includes('BCI')) {
            label = 'BCI';
          } else if (filename.includes('BHSI')) {
            label = 'BHSI';
          } else if (filename.includes('BPI')) {
            label = 'BPI';
          } else if (filename.includes('BSI')) {
            label = 'BSI';
          } else {
            // 파일명에서 인덱스 이름 추출 시도
            const match = filename.match(/SIN_Timeseries_([A-Z]+)/);
            if (match) {
              label = match[1];
            } else {
              label = filename.replace('.xlsx', '').replace('SIN_Timeseries_', '');
            }
          }
        } else if (isFleetChart) {
          // Fleet Development: 컬럼명에서 키워드 추출하여 간단한 이름으로 변경
          const colLower = col.toLowerCase();
          if (colLower.includes('handysize')) {
            label = 'Handysize';
          } else if (colLower.includes('capesize')) {
            label = 'Capesize';
          } else if (colLower.includes('panamax')) {
            label = 'Panamax';
          } else if (colLower.includes('handymax')) {
            label = 'Handymax';
          } else {
            label = col; // 매칭되지 않으면 원본 사용
          }
        } else if (isDrybulkChart) {
          // Dry Bulk Trade: 컬럼명에서 키워드 추출하여 간단한 이름으로 변경
          const colLower = col.toLowerCase();
          if (colLower.includes('iron ore')) {
            label = 'Iron Ore';
          } else if (colLower.includes('grain')) {
            label = 'Grain';
          } else if (colLower.includes('minor')) {
            label = 'Minor';
          } else if (colLower.includes('coal')) {
            label = 'Coal';
          } else {
            label = col; // 매칭되지 않으면 원본 사용
          }
        } else {
          label = `${dataset.filename} - ${col}`;
        }
        
        // Dry Bulk Trade 차트인 경우 각 컬럼마다 다른 색상 할당
        let colorIndex;
        if (isDrybulkChart) {
          // Dry Bulk Trade는 컬럼 인덱스 기반으로 색상 할당
          colorIndex = colIdx % colors.length;
        } else {
          // 다른 차트는 파일 인덱스 기반으로 색상 할당
          colorIndex = idx % colors.length;
        }
        
        datasetsConfig.push({
          label: label,
          data: dateIndices.map((x, i) => ({ x, y: values[i] })),
          borderColor: colors[colorIndex],
          backgroundColor: colors[colorIndex] + '40',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointBackgroundColor: colors[colorIndex],
          pointBorderColor: colors[colorIndex],
        });
      }
    });
  });
  
  // Y축 레이블 결정
  let yAxisLabel = '';
  if (isIndicesChart) {
    yAxisLabel = '$/day';
  } else if (isFleetChart) {
    yAxisLabel = 'DWT million';
  } else if (isDrybulkChart) {
    yAxisLabel = 'billion tonne-miles';
  }
  
  chartInstances[chartKey] = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasetsConfig
    },
    options: {
      animation: true,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: sortedDates.length > 0 ? sortedDates.length - 1 : 10,
          ticks: {
            stepSize: Math.max(1, Math.floor(sortedDates.length / 10)),
            callback: function(value) {
              const index = Math.round(value);
              if (index >= 0 && index < sortedDates.length) {
                const date = new Date(sortedDates[index]);
                if (!isNaN(date.getTime())) {
                  // "24.01" 형식으로 변환 (년.월)
                  const year = date.getFullYear().toString().slice(-2); // 마지막 2자리
                  const month = String(date.getMonth() + 1).padStart(2, '0'); // 월을 2자리로
                  return `${year}.${month}`;
                }
              }
              return '';
            }
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          title: {
            display: yAxisLabel !== '',
            text: yAxisLabel,
            font: {
              size: 12,
            },
          },
        },
      },
    },
  });
}

// ==================== 날짜 탭 전환 기능 (과거 데이터) ====================
function setupDateTabs() {
  const dateTabButtons = document.querySelectorAll('.date-tab');

  dateTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedDate = button.getAttribute('data-date');

      // 모든 날짜 탭 버튼 비활성화
      dateTabButtons.forEach((btn) => btn.classList.remove('active'));
      // 선택된 날짜 탭 활성화
      button.classList.add('active');

      // TODO: 선택된 날짜에 해당하는 데이터 로드
      // 현재는 레이아웃만 구현
      console.log('선택된 날짜:', selectedDate);
      
      // Dry Bulk 페이지인 경우에만 그래프 데이터 다시 로드
      if (document.getElementById('drybulkTradeChart')) {
        loadChartData();
        loadReportForDate(selectedDate);
      }
      
      // 추후 구현: loadChartDataForDate(selectedDate);
    });
  });
}

function getActiveDateLabel() {
  const activeTab = document.querySelector('.date-tab.active');
  return activeTab ? activeTab.getAttribute('data-date') : null;
}

async function loadReportForDate(dateLabel) {
  const reportContainer = document.getElementById('drybulkReportContent');
  const reportMeta = document.getElementById('reportMeta');
  if (!reportContainer) return;

  reportContainer.innerHTML = '<div class="loading">보고서를 불러오는 중...</div>';

  const params = new URLSearchParams();
  if (dateLabel) {
    const normalized = dateLabel.replace('/', '-');
    params.set('month', normalized);
  }

  let url = `${API_BASE_URL}/reports/${REPORT_CATEGORY}`;
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('보고서를 불러오지 못했습니다.');
    }
    const data = await response.json();
    const report = data.report;
    if (!report) {
      throw new Error('보고서 데이터가 비어 있습니다.');
    }

    if (reportMeta && dateLabel) {
      reportMeta.textContent = `${dateLabel} 보고서 · ${report.original_filename}`;
    }
    reportContainer.innerHTML = report.html_content || '<p>보고서 내용이 비어 있습니다.</p>';
  } catch (error) {
    console.error('보고서 로드 오류:', error);
    reportContainer.innerHTML = '<div class="error">보고서를 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// 페이지 로드 시 그래프 데이터 로드 및 날짜 탭 설정
document.addEventListener('DOMContentLoaded', () => {
  setupDateTabs();
  // Dry Bulk 페이지인 경우에만 그래프 데이터 로드
  if (document.getElementById('drybulkTradeChart')) {
    loadChartData();
    loadReportForDate(getActiveDateLabel());
  }
});
