// 메인 화면 JavaScript

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

// Weekly Issues의 첫 번째 행과 본문을 추출하는 함수 (ISS-01이 포함된 것)
// Weekly Issues의 Top 3 title_ko를 추출하는 함수
function extractFirstRowWithContent(htmlContent) {
  if (!htmlContent) return '';
  
  // 임시 div를 만들어서 HTML 파싱
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // 1) issue-card 안의 title_ko(span.issue-text) 전부 찾기
  const titleNodes = tempDiv.querySelectorAll('.issue-card .issue-title .issue-text');
  
  if (titleNodes.length > 0) {
    // 앞에서부터 3개만 사용
    const topTitles = Array.from(titleNodes)
      .slice(0, 3)
      .map(el => (el.textContent || '').trim())
      .filter(t => t.length > 0);

    if (topTitles.length > 0) {
      // "1. 제목", "2. 제목" 형태로 줄바꿈 (같은 bullet 내 줄바꿈 시 들여쓰기 일정하게)
      return topTitles
        .map((t, idx) => {
          const num = `${idx + 1}.`;
          // 번호는 float로 처리하고, 제목은 padding-left로 들여쓰기 (번호는 볼드체)
          return `<div style="margin-bottom: 0.5rem; overflow: hidden; font-size: inherit; word-break: keep-all; overflow-wrap: break-word;"><span style="float: left; width: 2em; text-align: right; margin-right: 0.5rem; font-weight: bold;">${num}</span><span style="display: block; padding-left: 2.5em; text-indent: 0; word-break: keep-all; overflow-wrap: break-word;">${t}</span></div>`;
        })
        .join('');
    }
  }

  // ===== 여기서부터는 fallback: 옛날 ISS-01 기반 HTML일 때 대비용 =====
  const allElements = tempDiv.querySelectorAll(
    'p, li, div, h1, h2, h3, h4, h5, h6, span, td, th, tr, article, section'
  );
  
  for (const element of allElements) {
    const text = element.textContent || element.innerText || '';
    // ISS-01 패턴 찾기 (ISS-01, ISS-1, ISS-01: 등 다양한 형태 지원)
    if (text.match(/ISS-\s*0?1/i)) {
      const titleText = text.trim();
      
      let contentText = '';
      let nextSibling = element.nextElementSibling;
      let contentParts = [];
      
      while (nextSibling && contentParts.length < 3) {
        const siblingText = (nextSibling.textContent || '').trim();
        if (siblingText.length > 0 && !siblingText.match(/ISS-\s*0?[2-9]/i)) {
          contentParts.push(siblingText);
        } else {
          break;
        }
        nextSibling = nextSibling.nextElementSibling;
      }
      
      if (contentParts.length === 0 && element.parentElement) {
        const parent = element.parentElement;
        const allParentText = parent.textContent || '';
        const titleIndex = allParentText.indexOf(titleText);
        if (titleIndex >= 0) {
          const afterTitle = allParentText.substring(titleIndex + titleText.length).trim();
          const nextIssMatch = afterTitle.match(/ISS-\s*0?[2-9]/i);
          if (nextIssMatch) {
            contentText = afterTitle.substring(0, nextIssMatch.index).trim();
          } else {
            contentText = afterTitle.substring(0, 200).trim();
          }
        }
      } else {
        contentText = contentParts.join(' ').trim();
      }
      
      if (contentText) {
        return `${titleText}<br><br><span style="font-size: 0.85em; color: #6b7280;">${contentText}</span>`;
      } else {
        return titleText;
      }
    }
  }
  
  const firstElement = tempDiv.querySelector('p, li, div, h1, h2, h3, h4, h5, h6, span, td, th');
  if (firstElement) {
    const text = firstElement.textContent.trim();
    if (text.length > 0) {
      return text;
    }
  }
  
  const allText = tempDiv.textContent || tempDiv.innerText || '';
  const firstLine = allText.trim().split('\n')[0] || allText.trim().split(/\s+/)[0] || '';
  
  return firstLine.trim();
}

// Weekly Issues 로드 함수
async function loadWeeklyIssuesPreview() {
  // Weekly Issues 박스 찾기
  const weeklyBoxes = Array.from(document.querySelectorAll('.bottom-box'));
  const weeklyBox = weeklyBoxes.find(box => {
    const title = box.querySelector('.bottom-box-title')?.textContent || '';
    return title.includes('Weekly');
  });
  
  const contentEl = weeklyBox?.querySelector('.bottom-box-content');
  if (!contentEl) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/reports/weekly_issues`);
    if (!response.ok) {
      throw new Error('보고서를 불러오지 못했습니다.');
    }
    const data = await response.json();
    const report = data.report;
    
    if (report && report.html_content) {
      const firstRowWithContent = extractFirstRowWithContent(report.html_content);
      if (firstRowWithContent) {
        contentEl.innerHTML = `
          <div style="margin: 0; padding: 1rem 1.25rem; background: #f9fafb; border-radius: 8px; color: #1f2937; font-size: 1.3rem; line-height: 1.9; letter-spacing: 0.01em; word-break: keep-all; overflow-wrap: break-word;">
            ${firstRowWithContent}
            <div style="margin-top: 1.25rem; text-align: right;">
              <a href="/weekly" class="bottom-box-more-btn" style="display: inline-block; padding: 0.75rem 1.5rem; background: #e5e7eb; color: #111827; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s ease;">
                더보기 →
              </a>
            </div>
          </div>
        `;
      } else {
        contentEl.innerHTML = '<p style="margin: 0; padding: 1rem 1.25rem; color: #9ca3af; font-size: 1.05rem; line-height: 1.8; text-align: center;">내용이 없습니다.</p>';
      }
    } else {
      contentEl.innerHTML = '<p style="margin: 0; padding: 1rem 1.25rem; color: #9ca3af; font-size: 1.05rem; line-height: 1.8; text-align: center;">보고서가 없습니다.</p>';
    }
  } catch (error) {
    console.error('Weekly Issues 로드 오류:', error);
    contentEl.innerHTML = '<p style="margin: 0; padding: 1rem 1.25rem; color: #9ca3af; font-size: 1.05rem; line-height: 1.8; text-align: center;">로드 중 오류가 발생했습니다.</p>';
  }
}
function extractReportTitle(htmlContent) {
  if (!htmlContent) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // 1) 우리 템플릿의 페이지 헤더 제목
  const headerTitle = doc.querySelector('.page-title');
  if (headerTitle && headerTitle.textContent.trim()) {
    return headerTitle.textContent.trim();
  }

  // 2) <title> 태그
  const titleTag = doc.querySelector('title');
  if (titleTag && titleTag.textContent.trim()) {
    return titleTag.textContent.trim();
  }

  // 3) 첫 번째 h1
  const h1 = doc.querySelector('h1');
  if (h1 && h1.textContent.trim()) {
    return h1.textContent.trim();
  }

  return '';
}


function extractBreakingNewsContent(fullHtml) {
  if (!fullHtml) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");

  // "0) Executive Summary" 헤딩 찾기
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
  const execHeading = headings.find((h) =>
    h.textContent.trim().match(/^0\)\s*Executive\s*Summary/i)
  );

  if (!execHeading) return "";

  // 헤딩 다음에서 첫 번째 bullet(li) 하나만 찾기
  let el = execHeading.nextElementSibling;

  while (el) {
    const tag = el.tagName.toUpperCase();

    // 다음 번호 섹션(1), 2), 3)...)의 헤딩을 만나면 종료
    if (
      (tag === "H1" || tag === "H2" || tag === "H3") &&
      /^\d\)\s/.test(el.textContent.trim())
    ) {
      break;
    }

    if (tag === "UL" || tag === "OL") {
      const firstLi = el.querySelector("li");
      if (firstLi) {
        // 헤딩은 빼고, bullet 하나만 감싼 ul만 반환
        return `<ul style="margin: 0; padding-left: 1.25em; word-break: keep-all; overflow-wrap: break-word;">${firstLi.outerHTML}</ul>`;
      }
      break;
    }

    el = el.nextElementSibling;
  }

  return "";
}


// 물류 속보 로드 함수
async function loadBreakingNewsPreview() {
  // 물류 속보 박스 찾기
  const breakingBoxes = Array.from(document.querySelectorAll('.bottom-box'));
  const breakingBox = breakingBoxes.find(box => {
    const title = box.querySelector('.bottom-box-title')?.textContent || '';
    return title.includes('물류 속보');
  });
  
  const contentEl = breakingBox?.querySelector('.bottom-box-content');
  if (!contentEl) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/reports/breaking_news`);
    if (!response.ok) {
      throw new Error('보고서를 불러오지 못했습니다.');
    }
    const data = await response.json();
    const report = data.report;
    
    if (report && report.html_content) {
      const previewContent = extractBreakingNewsContent(report.html_content);
      const reportTitle = extractReportTitle(report.html_content) || '물류 속보 리포트';
      
      if (previewContent) {
        contentEl.innerHTML = `
        <div style="margin: 0; padding: 1.2rem 1.25rem; background: #f9fafb; border-radius: 8px;">
          <div style="font-weight: 700; color: #111827; font-size: 1.6rem; margin-bottom: 0.875rem; letter-spacing: -0.01em;">
            ${reportTitle}
          </div>
          <div style="color: #1f2937; font-size: 1.3rem; line-height: 1.9; letter-spacing: 0.01em; word-break: keep-all; overflow-wrap: break-word;">
            ${previewContent}
          </div>
          <div style="margin-top: 1.25rem; text-align: right;">
            <a href="/breaking" class="bottom-box-more-btn" style="display: inline-block; padding: 0.75rem 1.5rem; background: #e5e7eb; color: #111827; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s ease;">
              더보기 →
            </a>
          </div>
        </div>
      `;
      
      } else {
        contentEl.innerHTML = `
          <div style="margin: 0; padding: 1rem 1.25rem;">
            <div style="font-weight: 700; color: #111827; font-size: 1.1rem; margin-bottom: 0.875rem; letter-spacing: -0.01em;">${reportTitle}</div>
            <p style="margin: 0; color: #9ca3af; font-size: 0.98rem; line-height: 1.8; text-align: center;">내용이 없습니다.</p>
          </div>
        `;
      }
    } else {
      contentEl.innerHTML = '<p style="margin: 0; padding: 0.5rem; color: #9ca3af; font-size: 0.9rem;">보고서가 없습니다.</p>';
    }
  } catch (error) {
    console.error('물류 속보 로드 오류:', error);
    contentEl.innerHTML = '<p style="margin: 0; padding: 0.5rem; color: #9ca3af; font-size: 0.9rem;">로드 중 오류가 발생했습니다.</p>';
  }
}

// ==================== 심층 리포트(Deep Research) 미리보기 ====================
function extractDeepReportPreview(htmlContent) {
  if (!htmlContent) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // 메인 컨텐츠 영역 후보들
  const mainSelectors = [
    ".report-content",
    ".content-area",
    ".page-container",
    "article",
    "main"
  ];

  let container = null;
  for (const sel of mainSelectors) {
    const el = doc.querySelector(sel);
    if (el) {
      container = el;
      break;
    }
  }
  if (!container) {
    container = doc.body;
  }

  // 문단, 리스트 등 텍스트 요소 중 앞쪽 몇 개만 사용
  const blocks = container.querySelectorAll("p, li, div, section");
  const parts = [];

  for (const el of blocks) {
    const text = (el.textContent || "").trim();
    if (!text) continue;

    parts.push(
      `<p style="margin: 0 0 0.5rem 0;">${text}</p>`
    );

    if (parts.length >= 4) break; // 앞의 몇 줄만 사용
  }

  return parts.join("") || "";
}

function extractDeepReportPreview(htmlContent) {
  if (!htmlContent) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  let container =
    doc.querySelector(".markdown-body") ||
    doc.querySelector(".report-content, .content-area, .page-container, article, main") ||
    doc.body;

  const mainTitle =
    (doc.querySelector(".page-title")?.textContent || "").trim() ||
    (doc.querySelector("title")?.textContent || "").trim();

  const headingNodes = container.querySelectorAll("h1, h2, h3");
  const items = [];

  for (const h of headingNodes) {
    let text = (h.textContent || "").trim();
    if (!text) continue;
    if (text === mainTitle) continue;

    // 🔹 앞쪽 넘버링 제거: "1. ", "2)", "3-1.", "4-2) " 같은 패턴
    text = text.replace(/^\s*\d+(?:[\-\.]\d+)*[.)]?\s*/, "");
    if (!text) continue;

    // 🔹 레벨 정보 같이 저장 (h1 / h2 / h3)
    const level = h.tagName.toLowerCase(); // "h1", "h2", "h3"
    items.push({ level, text });

    if (items.length >= 8) break;
  }

  if (items.length) {
    const liHtml = items
      .map(({ level, text }) => {
        // 레벨별 스타일 분기
        let fontSize = "2.5rem";
        let fontWeight = "300";
        let marginLeft = "0";

        if (level === "h1") {
          fontSize = "1.2rem";   // 제일 크고
          fontWeight = "500";
          marginLeft = "0";
        } else if (level === "h2") {
          fontSize = "0.5rem";
          fontWeight = "500";
          marginLeft = "0.25rem";
        } else if (level === "h3") {
          fontSize = "2.5rem";   // 제일 작게
          fontWeight = "100";
          marginLeft = "0.5rem";
        }

        return `
          <li
            style="
              margin: 0 0 0.25rem 0;
              margin-left: ${marginLeft};
              word-break: keep-all;
              overflow-wrap: break-word;
            "
          >
            <span style="font-size: ${fontSize}; font-weight: ${fontWeight};">
              ${text}
            </span>
          </li>
        `;
      })
      .join("");

    return `
      <div style="word-break: keep-all; overflow-wrap: break-word;">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600;">주요 목차</p>
        <ol style="margin: 0; padding-left: 1.25rem;">
          ${liHtml}
        </ol>
      </div>
    `;
  }

  // 이하 폴백 로직은 그대로…
  const blocks = container.querySelectorAll("p, li, div, section");
  const parts = [];

  for (const el of blocks) {
    const text = (el.textContent || "").trim();
    if (!text) continue;

    parts.push(
      `<p style="margin: 0 0 0.5rem 0; word-break: keep-all; overflow-wrap: break-word;">${text}</p>`
    );

    if (parts.length >= 4) break;
  }

  return parts.join("") || "";
}


async function loadDeepResearchPreview() {
  // 심층 리포트 박스 찾기
  const bottomBoxes = Array.from(document.querySelectorAll(".bottom-box"));
  const deepBox = bottomBoxes.find((box) => {
    const title = box.querySelector(".bottom-box-title")?.textContent || "";
    return title.includes("심층 리포트");
  });

  const contentEl = deepBox?.querySelector(".bottom-box-content");
  if (!contentEl) return;

  try {
    const response = await fetch(`${API_BASE_URL}/reports/deep_research`);
    if (!response.ok) {
      throw new Error("보고서를 불러오지 못했습니다.");
    }
    const data = await response.json();
    const report = data.report;

    if (report && report.html_content) {
      const previewHtml = extractDeepReportPreview(report.html_content);
      const title =
        extractReportTitle(report.html_content) || "심층 리포트";

      if (previewHtml) {
        contentEl.innerHTML = `
          <div style="margin: 0; padding: 1rem 1.25rem; background: #f9fafb; border-radius: 8px;">
            <div style="font-weight: 700; color: #111827; font-size: 1.6rem; margin-bottom: 0.75rem;">
              ${title}
            </div>
            <div style="color: #1f2937; font-size: 1.rem; line-height: 1.8; word-break: keep-all; overflow-wrap: break-word;">
              ${previewHtml}
            </div>
            <div style="margin-top: 1.25rem; text-align: right;">
              <a href="/deep" class="bottom-box-more-btn" style="display: inline-block; padding: 0.75rem 1.5rem; background: #e5e7eb; color: #111827; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.2s ease;">
                더보기 →
              </a>
            </div>
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div style="margin: 0; padding: 1rem 1.25rem;">
            <div style="font-weight: 700; color: #111827; font-size: 1.1rem; margin-bottom: 0.5rem;">${title}</div>
            <p style="margin: 0; color: #9ca3af; font-size: 0.98rem; line-height: 1.8; text-align: center;">미리보기로 표시할 내용이 없습니다.</p>
          </div>
        `;
      }
    } else {
      contentEl.innerHTML =
        '<p style="margin: 0; padding: 0.5rem; color: #9ca3af; font-size: 0.9rem;">보고서가 없습니다.</p>';
    }
  } catch (error) {
    console.error("심층 리포트 로드 오류:", error);
    contentEl.innerHTML =
      '<p style="margin: 0; padding: 0.5rem; color: #9ca3af; font-size: 0.9rem;">로드 중 오류가 발생했습니다.</p>';
  }
}


// BCI Index 그래프 로드 함수
let bciChartInstance = null;

// 캐시 설정
const CACHE_DURATION = 5 * 60 * 1000; // 5분
let bciDataCache = null;
let bciCacheTimestamp = null;

// BCI 차트 렌더링 함수 (캐시된 데이터 사용)
function renderBCIChart(filteredData, canvas, loading) {
  // 기존 차트 제거
  if (bciChartInstance) {
    bciChartInstance.destroy();
  }
  
  // 로딩 숨기기
  if (loading) {
    loading.style.display = 'none';
  }
  
  // Chart.js로 그래프 생성
  const ctx = canvas.getContext('2d');
  bciChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: filteredData.map(d => {
        const year = d.date.getFullYear().toString().slice(-2);
        const month = String(d.date.getMonth() + 1).padStart(2, '0');
        return `${year}.${month}`;
      }),
      datasets: [{
        label: 'BCI Index',
        data: filteredData.map(d => d.value),
        borderColor: '#1e40af',
        backgroundColor: '#1e40af40',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
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
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
  });
  
  console.log('BCI Chart created successfully');
}

async function loadBCIIndexChart() {
  const canvas = document.getElementById('drybulkBCIChart');
  const loading = document.getElementById('drybulkBCILoading');
  
  if (!canvas) {
    console.log('BCI Chart canvas not found');
    return;
  }
  
  // 캐시 확인
  const now = Date.now();
  if (bciDataCache && bciCacheTimestamp && (now - bciCacheTimestamp) < CACHE_DURATION) {
    console.log('Using cached BCI data');
    renderBCIChart(bciDataCache, canvas, loading);
    return;
  }
  
  try {
    console.log('Fetching BCI data from:', `${API_BASE_URL}/charts/data/bci`);
    const response = await fetch(`${API_BASE_URL}/charts/data/bci`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', response.status, errorText);
      throw new Error(`BCI 데이터를 불러오지 못했습니다. (${response.status})`);
    }
    
    const bciData = await response.json();
    console.log('BCI data received:', bciData);
    
    if (!bciData.data || bciData.data.length === 0) {
      console.log('BCI data is empty');
      if (loading) {
        loading.textContent = 'BCI 데이터가 없습니다.';
        loading.className = 'error';
      }
      return;
    }
    
    const dateCol = bciData.date_column;
    const targetColumn = bciData.target_column;
    
    // 데이터 변환 및 필터링 (백엔드에서 이미 2021년 이후 필터링됨)
    const filteredData = [];
    for (const row of bciData.data) {
      const dateVal = row[dateCol];
      if (!dateVal) continue;
      
      let date;
      if (typeof dateVal === 'string') {
        date = new Date(dateVal);
      } else if (dateVal instanceof Date) {
        date = dateVal;
      } else {
        continue;
      }
      
      if (!isNaN(date.getTime())) {
        const value = parseFloat(row[targetColumn]);
        if (!isNaN(value)) {
          filteredData.push({
            date: date,
            value: value
          });
        }
      }
    }
    
    console.log('Filtered data count:', filteredData.length);
    
    if (filteredData.length === 0) {
      console.log('No valid data');
      if (loading) {
        loading.textContent = '유효한 데이터가 없습니다.';
        loading.className = 'error';
      }
      return;
    }
    
    // 날짜 정렬
    filteredData.sort((a, b) => a.date - b.date);
    
    // 캐시에 저장
    bciDataCache = filteredData;
    bciCacheTimestamp = Date.now();
    
    // 차트 렌더링
    renderBCIChart(filteredData, canvas, loading);
    
  } catch (error) {
    console.error('BCI Index 그래프 로드 오류:', error);
    console.error('Error stack:', error.stack);
    if (loading) {
      loading.textContent = `데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`;
      loading.className = 'error';
    }
  }
}

// SCFI Index 그래프 로드 함수
let scfiChartInstance = null;

async function loadSCFIIndexChart() {
  const canvas = document.getElementById('containerSCFIChart');
  const loading = document.getElementById('containerSCFILoading');
  
  if (!canvas) {
    console.log('SCFI Chart canvas not found');
    return;
  }
  
  try {
    console.log('Fetching container chart data from:', `${API_BASE_URL}/charts/data/container`);
    const response = await fetch(`${API_BASE_URL}/charts/data/container`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', response.status, errorText);
      throw new Error(`그래프 데이터를 불러오지 못했습니다. (${response.status})`);
    }
    
    const chartData = await response.json();
    console.log('Container chart data received:', chartData);
    
    // scfi_weekly 그룹에서 Container SCFI 파일 찾기
    const scfiWeekly = chartData.scfi_weekly || [];
    console.log('SCFI Weekly datasets:', scfiWeekly);
    
    let scfiDataset = null;
    
    for (const dataset of scfiWeekly) {
      console.log('Checking dataset:', dataset.filename);
      if (dataset.filename && dataset.filename.includes('Container SCFI')) {
        scfiDataset = dataset;
        console.log('Found Container SCFI dataset:', scfiDataset);
        break;
      }
    }
    
    if (!scfiDataset || !scfiDataset.data || scfiDataset.data.length === 0) {
      console.log('SCFI dataset not found or empty');
      if (loading) {
        loading.textContent = 'SCFI 데이터가 없습니다.';
        loading.className = 'error';
      }
      return;
    }
    
    // 534015 코드가 포함된 컬럼 찾기
    const dateCol = scfiDataset.date_column;
    console.log('Date column:', dateCol);
    console.log('Available columns:', scfiDataset.columns);
    
    const targetColumn = scfiDataset.columns.find(col => 
      col !== dateCol && col.includes('534015')
    );
    
    console.log('Target column:', targetColumn);
    
    if (!targetColumn) {
      console.log('Target column not found');
      if (loading) {
        loading.textContent = 'SCFI 컬럼을 찾을 수 없습니다.';
        loading.className = 'error';
      }
      return;
    }
    
    // 2021년 이후 데이터 필터링
    const filteredData = [];
    for (const row of scfiDataset.data) {
      const dateVal = row[dateCol];
      if (!dateVal) continue;
      
      let date;
      if (typeof dateVal === 'string') {
        date = new Date(dateVal);
      } else if (dateVal instanceof Date) {
        date = dateVal;
      } else {
        continue;
      }
      
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2021) {
        const value = parseFloat(row[targetColumn]);
        if (!isNaN(value)) {
          filteredData.push({
            date: date,
            value: value
          });
        }
      }
    }
    
    console.log('Filtered data count:', filteredData.length);
    
    if (filteredData.length === 0) {
      console.log('No data after 2021');
      if (loading) {
        loading.textContent = '2021년 이후 데이터가 없습니다.';
        loading.className = 'error';
      }
      return;
    }
    
    // 날짜 정렬
    filteredData.sort((a, b) => a.date - b.date);
    
    // 기존 차트 제거
    if (scfiChartInstance) {
      scfiChartInstance.destroy();
    }
    
    // 로딩 숨기기
    if (loading) {
      loading.style.display = 'none';
    }
    
    // Chart.js로 그래프 생성 (빨간색)
    const ctx = canvas.getContext('2d');
    scfiChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filteredData.map(d => {
          const year = d.date.getFullYear().toString().slice(-2);
          const month = String(d.date.getMonth() + 1).padStart(2, '0');
          return `${year}.${month}`;
        }),
        datasets: [{
          label: 'SCFI Index',
          data: filteredData.map(d => d.value),
          borderColor: '#dc2626', // 빨간색
          backgroundColor: '#dc262640', // 빨간색 반투명
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
        }]
      },
      options: {
        animation: false,
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
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
        },
      },
    });
    
    console.log('SCFI Chart created successfully');
    
  } catch (error) {
    console.error('SCFI Index 그래프 로드 오류:', error);
    console.error('Error stack:', error.stack);
    if (loading) {
      loading.textContent = `데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`;
      loading.className = 'error';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // BCI Index 그래프 로드
  loadBCIIndexChart();
  // SCFI Index 그래프 로드
  loadSCFIIndexChart();
  // Weekly Issues 미리보기 로드
  loadWeeklyIssuesPreview();
  // 물류 속보 미리보기 로드
  loadBreakingNewsPreview();
  // 심층 리포트 미리보기 로드
  loadDeepResearchPreview();
  // 카테고리 박스 클릭 이벤트 제거 (버튼 클릭만 동작하도록)
  
  // 모든 카테고리 버튼에 이벤트 리스너 추가
  const categoryButtons = document.querySelectorAll('.category-btn');
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // 박스 클릭 이벤트 방지
      const category = button.dataset.category; // 'drybulk' or 'container'
      const type = button.dataset.type; // 'report' or 'news'
      
      // 페이지 이동 로직
      if (category === 'drybulk') {
        if (type === 'report') {
          // 전문기관 보고서 분석 -> /drybulk
          window.location.href = '/drybulk';
        } else if (type === 'news') {
          // 뉴스 미디어 분석 -> /drybulk-media
          window.location.href = '/drybulk-media';
        }
      } else if (category === 'container') {
        if (type === 'report') {
          // 전문기관 보고서 분석 -> /container
          window.location.href = '/container';
        } else if (type === 'news') {
          // 뉴스 미디어 분석 -> /container-media
          window.location.href = '/container-media';
        }
      }
    });
  });
  
  // 하단 박스들도 클릭 가능하도록 설정
  const bottomBoxes = document.querySelectorAll('.bottom-box');
  bottomBoxes.forEach(box => {
    box.style.cursor = 'pointer';
    box.addEventListener('click', (e) => {
      const title = box.querySelector('.bottom-box-title')?.textContent || '';
      console.log(`하단 박스 클릭: ${title}`);
      
      // Weekly Issues Top 10 클릭 시 /weekly로 이동
      if (title.includes('Weekly')) {
        window.location.href = '/weekly';
      } 
      // 물류 속보 클릭 시 /breaking으로 이동
      else if (title.includes('물류 속보')) {
        window.location.href = '/breaking';
      }
      // 심층 리포트 클릭 시 /deep으로 이동
      else if (title.includes('심층 리포트')) {
        window.location.href = '/deep';
      }
    });
  });
});

