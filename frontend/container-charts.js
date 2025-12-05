// API URL 설정
const getApiBaseUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const apiUrl = urlParams.get('api');
  if (apiUrl) {
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();
// 페이지별로 다른 리포트 카테고리를 사용할 수 있도록 body의 data-report-category에서 읽어옴
const REPORT_CATEGORY =
  (typeof document !== 'undefined' &&
    document.body &&
    document.body.getAttribute('data-report-category')) ||
  'container_clarksons';

let chartInstances = {
  containerTradeFleet: null,
  scfiWeekly: null
};

// ==================== 그래프 데이터 로드 ====================
async function loadContainerChartData() {
  try {
    const response = await fetch(`${API_BASE_URL}/charts/data/container`);
    if (!response.ok) {
      throw new Error('그래프 데이터를 불러오지 못했습니다.');
    }
    
    const chartData = await response.json();
    
    // Container Trade & Fleet Development 그래프
    const tradeFleetLoading = document.getElementById('containerTradeFleetLoading');
    const tradeFleetCanvas = document.getElementById('containerTradeFleetChart');
    if (chartData.container_trade_fleet && chartData.container_trade_fleet.length > 0) {
      if (tradeFleetLoading) tradeFleetLoading.style.display = 'none';
      if (tradeFleetCanvas) tradeFleetCanvas.style.display = 'block';
      initGroupChart('containerTradeFleetChart', chartData.container_trade_fleet, 'Container Trade & Fleet Development');
    } else {
      if (tradeFleetLoading) {
        tradeFleetLoading.textContent = '데이터가 없습니다.';
        tradeFleetLoading.className = 'error';
      }
    }
    
    // SCFI Weekly 그래프
    const scfiLoading = document.getElementById('scfiWeeklyLoading');
    const scfiCanvas = document.getElementById('scfiWeeklyChart');
    if (chartData.scfi_weekly && chartData.scfi_weekly.length > 0) {
      if (scfiLoading) scfiLoading.style.display = 'none';
      if (scfiCanvas) scfiCanvas.style.display = 'block';
      initGroupChart('scfiWeeklyChart', chartData.scfi_weekly, 'SCFI Weekly');
    } else {
      if (scfiLoading) {
        scfiLoading.textContent = '데이터가 없습니다.';
        scfiLoading.className = 'error';
      }
    }
  } catch (error) {
    console.error('그래프 데이터 로드 오류:', error);
    document.querySelectorAll('.loading').forEach(el => {
      if (el.id && el.id.includes('Loading')) {
        el.textContent = '데이터를 불러오는 중 오류가 발생했습니다.';
        el.className = 'error';
      }
    });
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
  
  // 날짜 정렬
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  // 첫 번째 그래프인지 확인 (이중 Y축 적용)
  const isFirstChart = canvasId === 'containerTradeFleetChart';
  
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
        
        // 레이블 생성: 5번째 행 값만 사용
        let label = col;
        const filename = dataset.filename || '';
        
        // 컬럼명 형식: "위 행값 - 중간 행값(5번째 행) - 아래 행값"
        // 예: "Container Trade - Annual - 548622" → "Annual"만 추출
        if (col.includes(' - ')) {
          const parts = col.split(' - ');
          if (parts.length >= 2) {
            // 중간 부분(5번째 행) 사용
            label = parts[1].trim();
          } else {
            label = col;
          }
        } else {
          // " - " 구분자가 없으면 원본 컬럼명 사용
          label = col;
        }
        
        // 컬럼 이름 확인을 위해 콘솔에 출력
        console.log(`[${canvasId}] 파일명: ${filename}, 원본 컬럼명: ${col}, 5번째 행 값: ${label}`);
        
        // 첫 번째 그래프에서 이중 Y축 적용
        let yAxisID = 'y';
        if (isFirstChart) {
          // 파일명과 컬럼명을 조합하여 코드 매칭
          // Container Trade Annual 파일: 548622 → 왼쪽 Y축
          // Containership Fleet Development 파일: 30977 → 오른쪽 Y축, 534501 → 왼쪽 Y축
          if (filename.includes('Container Trade Annual')) {
            // Container Trade Annual 파일의 모든 컬럼은 왼쪽 Y축
            yAxisID = 'y';
          } else if (filename.includes('Containership Fleet Development')) {
            // Containership Fleet Development 파일에서
            // 컬럼명에 534501이 포함되면 왼쪽, 30977이 포함되면 오른쪽
            if (col.includes('534501')) {
              yAxisID = 'y'; // 왼쪽 주 Y축
            } else if (col.includes('30977')) {
              yAxisID = 'y1'; // 오른쪽 보조 Y축
            }
          }
        }
        
        datasetsConfig.push({
          label: label,
          data: dateIndices.map((x, i) => ({ x, y: values[i] })),
          borderColor: colors[(idx * dataCols.length + colIdx) % colors.length],
          backgroundColor: colors[(idx * dataCols.length + colIdx) % colors.length] + '40',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          yAxisID: yAxisID,
        });
      }
    });
  });
  
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
          padding: {
            bottom: 60,
          },
          labels: {
            padding: 18,  // ✨ 범례 아이템 간 간격 증가
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
      layout: {
        padding: {
          top: 0,
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
                  const year = date.getFullYear().toString().slice(-2);
                  const month = String(date.getMonth() + 1).padStart(2, '0');
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
          type: 'linear',
          position: 'left',
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          title: {
            display: isFirstChart,
            text: '% Yr/Yr',
            font: {
              size: 12,
            },
          },
        },
        ...(isFirstChart ? {
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: false,
            grid: {
              drawOnChartArea: false, // 오른쪽 Y축은 그리드 표시 안 함
            },
            title: {
              display: true,
              text: '1000TEU',
              font: {
                size: 12,
              },
            },
          },
        } : {}),
      },
    },
  });
}

// ==================== 날짜 탭 전환 기능 ====================
function setupDateTabs() {
  const dateTabButtons = document.querySelectorAll('.date-tab');

  dateTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedDate = button.getAttribute('data-date');

      // 모든 날짜 탭 버튼 비활성화
      dateTabButtons.forEach((btn) => btn.classList.remove('active'));
      // 선택된 날짜 탭 활성화
      button.classList.add('active');

      // 그래프 데이터 다시 로드
      loadContainerChartData();
      // 보고서 다시 로드
      loadReportForDate(selectedDate);
    });
  });
}

function getActiveDateLabel() {
  const activeTab = document.querySelector('.date-tab.active');
  return activeTab ? activeTab.getAttribute('data-date') : null;
}

async function loadReportForDate(dateLabel) {
  const reportContainer = document.getElementById('newsReportContent');
  const reportMeta = document.getElementById('newsReportMeta');
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
    reportContainer.innerHTML = '<div class="error">보고서가 존재하지 않습니다.</div>';
  }
}

// 페이지 로드 시 그래프 데이터 로드 및 날짜 탭 설정
document.addEventListener('DOMContentLoaded', () => {
  setupDateTabs();
  loadContainerChartData();
  loadReportForDate(getActiveDateLabel());
});

