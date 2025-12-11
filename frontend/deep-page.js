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
const REPORT_CATEGORY = 'deep_research';

let allReports = [];
let activeReportId = null;

// 모든 보고서 목록 가져오기
async function loadAllReports() {
  const tabsContainer = document.getElementById('reportTabs');
  
  if (!tabsContainer) {
    console.error('Report tabs container not found');
    return;
  }

  tabsContainer.innerHTML = '<div class="loading">보고서 목록을 불러오는 중...</div>';

  try {
    const response = await fetch(`${REPORT_API_BASE_URL}/reports/${REPORT_CATEGORY}/list`);
    
    if (!response.ok) {
      throw new Error('보고서 목록을 불러오지 못했습니다.');
    }

    const data = await response.json();
    allReports = data.reports || [];

    if (allReports.length === 0) {
      tabsContainer.innerHTML = '<div class="loading">등록된 보고서가 없습니다.</div>';
      return;
    }

    // 탭 생성
    tabsContainer.innerHTML = '';
    allReports.forEach((report, index) => {
      const button = document.createElement('button');
      button.className = 'date-tab';
      if (index === 0) {
        button.classList.add('active');
        activeReportId = report.id;
      }
      button.setAttribute('data-report-id', report.id);
      // 파일명에서 .html 확장자 제거
      const displayName = report.original_filename.replace(/\.html?$/i, '');
      button.textContent = displayName;
      button.addEventListener('click', () => {
        // 모든 탭에서 active 제거
        document.querySelectorAll('.date-tab').forEach(btn => btn.classList.remove('active'));
        // 클릭한 탭에 active 추가
        button.classList.add('active');
        activeReportId = report.id;
        loadReport(report.id);
      });
      tabsContainer.appendChild(button);
    });

    // 첫 번째 보고서 로드
    if (allReports.length > 0) {
      loadReport(allReports[0].id);
    }
  } catch (error) {
    console.error('보고서 목록 로드 오류:', error);
    tabsContainer.innerHTML = '<div class="loading">보고서 목록을 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// 특정 보고서 로드
async function loadReport(reportId) {
  const contentEl = document.getElementById('newsReportContent');
  const metaEl = document.getElementById('newsReportMeta');
  
  if (!contentEl) {
    console.error('Content element not found');
    return;
  }

  contentEl.innerHTML = '<div class="loading">보고서를 불러오는 중...</div>';

  try {
    const response = await fetch(`${REPORT_API_BASE_URL}/reports/${REPORT_CATEGORY}/${reportId}`);
    
    if (!response.ok) {
      let errorMessage = '보고서를 불러오지 못했습니다.';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const report = data.report;

    if (!report) {
      throw new Error('보고서 데이터가 비어 있습니다.');
    }

    if (metaEl) {
      // 파일명에서 .html 확장자 제거
      const displayName = report.original_filename.replace(/\.html?$/i, '');
      metaEl.textContent = displayName;
    }

    contentEl.innerHTML = report.html_content || '<p>보고서 내용이 없습니다.</p>';
  } catch (error) {
    console.error('보고서 로드 오류:', error);
    if (error.message === "보고서가 존재하지 않습니다.") {
      contentEl.innerHTML = `<div class="error">${error.message}</div>`;
    } else {
      contentEl.innerHTML = `<div class="error">보고서를 불러오는 중 오류가 발생했습니다: ${error.message}</div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('deep-page.js: DOMContentLoaded');
  loadAllReports();
});





