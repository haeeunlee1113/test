function getReportApiBaseUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiUrl = urlParams.get('api');
  if (apiUrl) {
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
}

const REPORT_API_BASE_URL = getReportApiBaseUrl();

// REPORT_CATEGORY를 함수로 변경하여 DOMContentLoaded 이후에 읽도록 함
function getReportCategory() {
  // data-report-category 속성을 직접 읽음 (dataset은 camelCase로 변환하므로 직접 읽는 것이 안전)
  const category = document.body.getAttribute('data-report-category') || '';
  console.log('Report Category from attribute:', category);
  return category;
}

function setupDateTabs(callback) {
  const dateTabButtons = document.querySelectorAll('.date-tab');
  dateTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      dateTabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      callback(button.getAttribute('data-date'));
    });
  });
}

function getActiveDateLabel() {
  const activeTab = document.querySelector('.date-tab.active');
  return activeTab ? activeTab.getAttribute('data-date') : null;
}

async function loadReport(dateLabel) {
  const contentEl = document.getElementById('newsReportContent') || document.getElementById('drybulkReportContent') || document.getElementById('reportContent');
  const metaEl = document.getElementById('newsReportMeta') || document.getElementById('reportMeta');
  const REPORT_CATEGORY = getReportCategory();
  
  console.log('Loading report:', { contentEl, REPORT_CATEGORY, dateLabel });
  
  if (!contentEl) {
    console.error('Content element not found');
    return;
  }
  
  if (!REPORT_CATEGORY) {
    console.error('Report category not found');
    contentEl.innerHTML = '<div class="error">보고서 카테고리를 찾을 수 없습니다.</div>';
    return;
  }

  contentEl.innerHTML = '<div class="loading">보고서를 불러오는 중...</div>';

  const params = new URLSearchParams();
  if (dateLabel) {
    params.set('month', dateLabel);
  }
  let url = `${REPORT_API_BASE_URL}/reports/${REPORT_CATEGORY}`;
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    console.log('Fetching report from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `보고서가 존재하지 않습니다. (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 메시지 사용
        const errorText = await response.text();
        console.error('Response error:', errorText);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Report data received:', data);
    
    const report = data.report;
    if (!report) {
      throw new Error('보고서 데이터가 비어 있습니다.');
    }
    
    if (metaEl) {
      const label = report.requested_month || dateLabel || '';
      let dateText = '최신 보고서';
      if (label) {
        // 분기 형식 처리 (2025-1Q -> 2025-1Q)
        if (label.includes('Q')) {
          dateText = `${label} 보고서`;
        } 
        // 반기 형식 처리 (2025-하, 2025-상)
        else if (label.includes('하') || label.includes('상')) {
          dateText = `${label} 보고서`;
        } 
        // 월 형식 처리
        else {
          dateText = `${label} 보고서`;
        }
      }
      metaEl.textContent = `${dateText} · ${report.original_filename}`;
    }
    
    contentEl.innerHTML = report.html_content || '<p>보고서 내용이 없습니다.</p>';
    console.log('Report loaded successfully');
  } catch (error) {
    console.error('Error loading report:', error);
    // "보고서가 존재하지 않습니다." 메시지는 그대로 표시
    if (error.message === "보고서가 존재하지 않습니다.") {
      contentEl.innerHTML = `<div class="error">${error.message}</div>`;
    } else {
      contentEl.innerHTML = `<div class="error">${error.message}</div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('report-page.js: DOMContentLoaded');
  console.log('Body dataset:', document.body.dataset);
  console.log('Body attribute:', document.body.getAttribute('data-report-category'));
  
  // 약간의 지연을 두고 실행 (다른 스크립트와의 충돌 방지)
  setTimeout(() => {
    setupDateTabs(loadReport);
    loadReport(getActiveDateLabel());
  }, 100);
});

