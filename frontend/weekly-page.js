// API URL 설정
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

// 주차 데이터 구조: { year: { month: [weeks] } }
let weeklyData = {};
let allWeeks = []; // { label: "2025년 11월 4주", value: "2025-11-W4", date: Date }

// 현재 선택된 주
let selectedWeek = null;

// 날짜에서 주차 계산 (월의 몇 번째 주인지)
function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const dayOfMonth = date.getDate();
  const weekNumber = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  return weekNumber;
}

// 파일명에서 주차 정보 추출 (예: "2025-11-W4.html" -> { year: 2025, month: 11, week: 4 })
function parseWeekFromFilename(filename) {
  const match = filename.match(/(\d{4})-(\d{1,2})-W(\d{1,2})/i);
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
      week: parseInt(match[3])
    };
  }
  return null;
}

// 주차 값을 라벨로 변환 (예: "2025-11-W4" -> "2025년 11월 4주")
function weekValueToLabel(value) {
  const match = value.match(/(\d{4})-(\d{1,2})-W(\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = parseInt(match[2]);
    const week = parseInt(match[3]);
    return `${year}년 ${month}월 ${week}주`;
  }
  return value;
}

// 라벨을 주차 값으로 변환 (예: "2025년 11월 4주" -> "2025-11-W4")
function labelToWeekValue(label) {
  const match = label.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})주/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const week = match[3];
    return `${year}-${month}-W${week}`;
  }
  return null;
}

// 사용 가능한 주차 목록 가져오기
async function fetchAvailableWeeks() {
  try {
    // 백엔드 API에서 주차 목록 가져오기
    const response = await fetch(`${REPORT_API_BASE_URL}/reports/weekly_issues/list`);
    
    if (!response.ok) {
      throw new Error('주차 목록을 가져올 수 없습니다.');
    }
    
    const data = await response.json();
    const reports = data.reports || [];
    
    if (reports.length === 0) {
      console.warn('주차 보고서가 없습니다.');
      return generateDefaultWeeks();
    }
    
    // API 응답을 주차 객체 배열로 변환
    const weeks = reports.map(report => ({
      value: report.week_value,
      label: report.label,
      year: report.year,
      month: report.month,
      week: report.week
    }));
    
    return weeks;
  } catch (error) {
    console.error('Error fetching weeks:', error);
    // 에러 발생 시 기본 데이터 반환
    return generateDefaultWeeks();
  }
}

// 기본 주차 목록 생성 (2025년 11-12월)
function generateDefaultWeeks() {
  const weeks = [];
  const year = 2025;
  
  for (let month = 11; month <= 12; month++) {
    for (let week = 1; week <= 5; week++) {
      weeks.push({
        value: `${year}-${String(month).padStart(2, '0')}-W${week}`,
        label: `${year}년 ${month}월 ${week}주`,
        year: year,
        month: month,
        week: week
      });
    }
  }
  
  return weeks.sort((a, b) => {
    if (a.month !== b.month) return b.month - a.month;
    return b.week - a.week;
  });
}

// 주차 데이터를 트리 구조로 변환
function buildArchiveTree(weeks) {
  const tree = {};
  
  weeks.forEach(week => {
    if (!tree[week.year]) {
      tree[week.year] = {};
    }
    if (!tree[week.year][week.month]) {
      tree[week.year][week.month] = [];
    }
    tree[week.year][week.month].push(week);
  });
  
  return tree;
}

// 아카이브 트리 렌더링
function renderArchiveTree() {
  const container = document.getElementById('archiveTree');
  container.innerHTML = '';
  
  const years = Object.keys(weeklyData).sort((a, b) => b - a);
  
  years.forEach(year => {
    const yearDiv = document.createElement('div');
    yearDiv.className = 'archive-year';
    
    const yearHeader = document.createElement('div');
    yearHeader.className = 'archive-year-header';
    yearHeader.innerHTML = `
      <span>${year}년</span>
      <span class="dropdown-icon">▶</span>
    `;
    yearHeader.addEventListener('click', () => {
      yearDiv.classList.toggle('expanded');
      yearHeader.classList.toggle('expanded');
    });
    
    const monthsDiv = document.createElement('div');
    monthsDiv.className = 'archive-months';
    
    const months = Object.keys(weeklyData[year]).sort((a, b) => b - a);
    
    months.forEach(month => {
      const monthDiv = document.createElement('div');
      monthDiv.className = 'archive-month';
      
      const monthHeader = document.createElement('div');
      monthHeader.className = 'archive-month-header';
      monthHeader.innerHTML = `
        <span>${month}월</span>
        <span class="dropdown-icon">▶</span>
      `;
      monthHeader.addEventListener('click', () => {
        monthDiv.classList.toggle('expanded');
        monthHeader.classList.toggle('expanded');
      });
      
      const weeksDiv = document.createElement('div');
      weeksDiv.className = 'archive-weeks';
      
      const weeks = weeklyData[year][month].sort((a, b) => b.week - a.week);
      
      weeks.forEach(week => {
        const weekItem = document.createElement('div');
        weekItem.className = 'archive-week-item';
        weekItem.textContent = `${week.week}주 (${week.value})`;
        weekItem.addEventListener('click', () => {
          selectWeek(week.value);
        });
        weeksDiv.appendChild(weekItem);
      });
      
      monthDiv.appendChild(monthHeader);
      monthDiv.appendChild(weeksDiv);
      monthsDiv.appendChild(monthDiv);
    });
    
    yearDiv.appendChild(yearHeader);
    yearDiv.appendChild(monthsDiv);
    container.appendChild(yearDiv);
  });
  
  // 첫 번째 년도와 월 자동 확장
  if (years.length > 0) {
    const firstYear = container.querySelector('.archive-year');
    if (firstYear) {
      firstYear.classList.add('expanded');
      firstYear.querySelector('.archive-year-header').classList.add('expanded');
      const firstMonth = firstYear.querySelector('.archive-month');
      if (firstMonth) {
        firstMonth.classList.add('expanded');
        firstMonth.querySelector('.archive-month-header').classList.add('expanded');
      }
    }
  }
}

// 주차 선택 처리
function selectWeek(weekValue) {
  selectedWeek = weekValue;
  
  // 이번 주 드롭다운 업데이트
  const currentWeekSelect = document.getElementById('currentWeekSelect');
  if (currentWeekSelect) {
    currentWeekSelect.value = weekValue;
  }
  
  // 현재 주 라벨 업데이트
  const currentWeekLabel = document.getElementById('currentWeekLabel');
  if (currentWeekLabel) {
    currentWeekLabel.textContent = weekValueToLabel(weekValue);
  }
  
  // 아카이브 항목 활성화
  document.querySelectorAll('.archive-week-item').forEach(item => {
    item.classList.remove('active');
    if (item.textContent.includes(weekValue)) {
      item.classList.add('active');
    }
  });
  
  // 보고서 로드
  loadReport(weekValue);
}

// 보고서 로드
async function loadReport(weekValue) {
  const contentEl = document.getElementById('reportContent');
  
  if (!contentEl) {
    console.error('Content element not found');
    return;
  }
  
  contentEl.innerHTML = '<div class="loading">보고서를 불러오는 중...</div>';
  
  const params = new URLSearchParams();
  if (weekValue) {
    // 파일명 형식으로 검색하기 위해 month 파라미터에 주차 값 전달
    params.set('month', weekValue);
  }
  
  let url = `${REPORT_API_BASE_URL}/reports/weekly_issues`;
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
    
    contentEl.innerHTML = report.html_content || '<p>보고서 내용이 없습니다.</p>';
    console.log('Report loaded successfully');
  } catch (error) {
    console.error('Error loading report:', error);
    contentEl.innerHTML = `<div class="error">${error.message}</div>`;
  }
}

// 이번 주 드롭다운 초기화
function initializeCurrentWeekSelect() {
  const select = document.getElementById('currentWeekSelect');
  const label = document.getElementById('currentWeekLabel');
  
  if (!select) return;
  
  // 옵션 생성
  allWeeks.forEach(week => {
    const option = document.createElement('option');
    option.value = week.value;
    option.textContent = week.label;
    select.appendChild(option);
  });
  
  // 변경 이벤트
  select.addEventListener('change', (e) => {
    if (e.target.value) {
      selectWeek(e.target.value);
    }
  });
  
  // 최신 주 자동 선택
  if (allWeeks.length > 0) {
    const latestWeek = allWeeks[0];
    select.value = latestWeek.value;
    if (label) {
      label.textContent = latestWeek.label;
    }
    selectWeek(latestWeek.value);
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  console.log('weekly-page.js: DOMContentLoaded');
  
  // 주차 목록 가져오기
  allWeeks = await fetchAvailableWeeks();
  console.log('Available weeks:', allWeeks);
  
  // 트리 구조로 변환
  weeklyData = buildArchiveTree(allWeeks);
  console.log('Weekly data tree:', weeklyData);
  
  // UI 렌더링
  renderArchiveTree();
  initializeCurrentWeekSelect();
});
