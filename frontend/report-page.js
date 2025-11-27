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
  let url = `${API_BASE_URL}/reports/${REPORT_CATEGORY}`;
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    console.log('Fetching report from:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`보고서를 불러오지 못했습니다. (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Report data received:', data);
    
    const report = data.report;
    if (!report) {
      throw new Error('보고서 데이터가 비어 있습니다.');
    }
    
    if (metaEl) {
      const label = report.requested_month || dateLabel || '';
      const dateText = label ? `${label.replace('-', '/')} 보고서` : '최신 보고서';
      metaEl.textContent = `${dateText} · ${report.original_filename}`;
    }
    
    contentEl.innerHTML = report.html_content || '<p>보고서 내용이 없습니다.</p>';
    console.log('Report loaded successfully');
  } catch (error) {
    console.error('Error loading report:', error);
    contentEl.innerHTML = `<div class="error">보고서를 불러오는 중 오류가 발생했습니다: ${error.message}</div>`;
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

