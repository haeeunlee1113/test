// API URL 설정: URL 파라미터에서 가져오거나 기본값 사용
// 사용법: index.html?api=http://your-backend-url/api
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

const elements = {
  excelForm: document.querySelector('#excel-upload-form'),
  excelInput: document.querySelector('#excel-file-input'),
  excelLabel: document.querySelector('#excel-file-label'),
  excelFileName: document.querySelector('#excel-file-name'),
  excelFeedback: document.querySelector('#excel-upload-feedback'),
  pdfForm: document.querySelector('#pdf-upload-form'),
  pdfInput: document.querySelector('#pdf-file-input'),
  pdfLabel: document.querySelector('#pdf-file-label'),
  pdfFileName: document.querySelector('#pdf-file-name'),
  pdfFeedback: document.querySelector('#pdf-upload-feedback'),
  pdfList: document.querySelector('#pdf-list'),
  pdfPreviewTitle: document.querySelector('#pdf-preview-title'),
  pdfPreviewMeta: document.querySelector('#pdf-preview-meta'),
  pdfPreviewText: document.querySelector('#pdf-preview-text'),
};

const docxForms = document.querySelectorAll('.docx-upload-form');

const EXCEL_PLACEHOLDER = elements.excelFileName?.textContent ?? 'Select a file';
const DOCX_PLACEHOLDER = 'HTML / JSON 파일 선택';
const PDF_PLACEHOLDER = elements.pdfFileName?.textContent ?? 'Select a PDF';
const REPORT_ALLOWED_EXTENSIONS = ['.html', '.htm', '.json'];

const pdfState = {
  items: [],
  activeId: null,
};

// ==================== 차트 ====================
// 컬럼명 기반 자동 매핑 함수
function findColumnByNames(columns, namePatterns) {
  const lowerColumns = columns.map(col => col.toLowerCase());
  for (const pattern of namePatterns) {
    const index = lowerColumns.findIndex(col => 
      col.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(col)
    );
    if (index !== -1) return columns[index];
  }
  return null;
}

function initChart(data = null) {
  const ctx = document.getElementById('tradeIndexChart');
  if (!ctx) return;

  let labels;
  let lineData;
  let barData;

  if (data && data.data && data.data.length > 0) {
    const excelData = data.data;
    const columns = Object.keys(excelData[0] || {});
    
    // 컬럼명 기반 자동 매핑
    // 라벨 컬럼: date, 날짜, time, 시간, pub_date, title 등
    const labelColumn = findColumnByNames(columns, ['date', '날짜', 'time', '시간', 'pub_date', 'title', '제목']) || columns[0];
    
    // 라인 데이터 컬럼: value, 값, index, 지수, predict, 예측, bci 등
    const lineColumn = findColumnByNames(columns, ['value', '값', 'index', '지수', 'predict', '예측', 'bci', 'trade']) || (columns.length >= 2 ? columns[1] : null);
    
    // 바 데이터 컬럼: volume, 거래량, volume, 볼륨 등
    const barColumn = findColumnByNames(columns, ['volume', '거래량', '볼륨', 'vol']) || (columns.length >= 3 ? columns[2] : null);

    labels = excelData.map((row, index) => {
      const labelValue = row[labelColumn];
      return labelValue != null ? String(labelValue) : `Data ${index + 1}`;
    });

    if (lineColumn) {
      lineData = excelData.map((row) => {
        const value = parseFloat(row[lineColumn]);
        return Number.isNaN(value) ? 0 : value;
      });
    } else {
      lineData = [130, 130, 140, 160];
    }

    if (barColumn) {
      barData = excelData.map((row) => {
        const value = parseFloat(row[barColumn]);
        return Number.isNaN(value) ? 0 : value;
      });
    } else {
      barData = lineData.map(() => 0);
    }
  } else {
    labels = ['Oc 20', 'Oc 20', 'Op 18', 'Op 20'];
    lineData = [130, 130, 140, 160];
    barData = [40, 0, 3, 3];
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Trade Index',
          data: lineData,
          borderColor: '#1e40af',
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#1e40af',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Volume',
          data: barData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
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
            color: '#6b7280',
            font: {
              size: 12,
            },
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 12,
            },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 12,
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    },
  });
}

function updateStatsCards(data) {
  if (!data || !data.data || data.data.length === 0) return;

  const excelData = data.data;
  const columns = Object.keys(excelData[0] || {});
  const numericColumns = columns.slice(1, 5);
  const statCards = document.querySelectorAll('.stat-card');

  numericColumns.forEach((col, index) => {
    if (statCards[index]) {
      const values = excelData.map((row) => parseFloat(row[col])).filter((v) => !Number.isNaN(v));
      if (values.length >= 2) {
        const lastValue = values[values.length - 1];
        const prevValue = values[values.length - 2];
        const change = prevValue !== 0 ? (((lastValue - prevValue) / Math.abs(prevValue)) * 100).toFixed(0) : 0;

        const statValue = statCards[index].querySelector('.stat-value');
        if (statValue) {
          statValue.textContent = `${change >= 0 ? '+' : ''}${change}%`;
          statValue.className = `stat-value ${change >= 0 ? 'positive' : 'negative'}`;
        }
      }
    }
  });
}

// ==================== 공통 유틸 ====================
function showFeedback(target, message, isError = false) {
  if (!target) return;

  target.textContent = message;
  target.classList.remove('success', 'error');
  target.classList.add(isError ? 'error' : 'success');
  target.style.display = 'block';

  if (!isError) {
    setTimeout(() => {
      target.style.display = 'none';
    }, 3000);
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat('ko', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatFileSize(kilobytes) {
  if (kilobytes == null) return '-';
  const kb = Number(kilobytes);
  if (Number.isNaN(kb)) return '-';
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${Math.round(kb)} KB`;
}

// ==================== 컬럼명 표시 ====================
// ==================== Excel 업로드 ====================
const REQUIRED_FILE_TEMPLATES = [
  "BCI 5TC",
  "BHSI",
  "BPI",
  "BSI",
  "Cape Fleet Development",
  "Dry Bulk Trade",
  "Handy Fleet Development",
  "Panamax Fleet Development",
  "Supramax Fleet Development"
];

const getRequiredFileSuffix = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${month}_${year}`;
};

const REQUIRED_FILE_SUFFIX = getRequiredFileSuffix();

const REQUIRED_FILES = REQUIRED_FILE_TEMPLATES.map((template) => `SIN_Timeseries_${template}_${REQUIRED_FILE_SUFFIX}.xlsx`);

let uploadedFiles = new Set();

async function handleExcelUpload(event) {
  event.preventDefault();

  if (!elements.excelInput || !elements.excelForm) return;

  const { files } = elements.excelInput;
  if (!files || files.length === 0) {
    showFeedback(elements.excelFeedback, '업로드할 Excel 파일을 선택하세요.', true);
    return;
  }

  const submitButton = elements.excelForm.querySelector('button[type="submit"]');
  const progressDiv = document.querySelector('#upload-progress');
  const progressList = document.querySelector('#upload-progress-list');
  
  if (submitButton) submitButton.disabled = true;
  if (progressDiv) progressDiv.style.display = 'block';
  if (progressList) progressList.innerHTML = '';

  let successCount = 0;
  let errorCount = 0;

  // 모든 파일 업로드
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();
    formData.append('file', file);

    // 진행 상황 표시
    if (progressList) {
      const progressItem = document.createElement('div');
      progressItem.className = 'progress-item';
      progressItem.innerHTML = `
        <span class="progress-filename">${file.name}</span>
        <span class="progress-status uploading">업로드 중...</span>
      `;
      progressList.appendChild(progressItem);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/upload/excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '업로드 실패' }));
        throw new Error(error.error || '업로드 중 오류가 발생했습니다.');
      }

      const payload = await response.json();
      successCount++;
      uploadedFiles.add(file.name);

      // 진행 상황 업데이트
      if (progressList) {
        const progressItems = progressList.querySelectorAll('.progress-item');
        const currentItem = progressItems[progressItems.length - 1];
        if (currentItem) {
          currentItem.querySelector('.progress-status').textContent = '완료';
          currentItem.querySelector('.progress-status').className = 'progress-status completed';
        }
      }

    } catch (error) {
      console.error(`파일 ${file.name} 업로드 오류:`, error);
      errorCount++;

      // 진행 상황 업데이트
      if (progressList) {
        const progressItems = progressList.querySelectorAll('.progress-item');
        const currentItem = progressItems[progressItems.length - 1];
        if (currentItem) {
          currentItem.querySelector('.progress-status').textContent = `오류: ${error.message}`;
          currentItem.querySelector('.progress-status').className = 'progress-status error';
        }
      }
    }
  }

  // 결과 메시지
  if (successCount > 0) {
    showFeedback(elements.excelFeedback, `${successCount}개 파일 업로드 완료!${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`, false);
  } else {
    showFeedback(elements.excelFeedback, '모든 파일 업로드에 실패했습니다.', true);
  }

  elements.excelInput.value = '';
  if (elements.excelFileName) {
    elements.excelFileName.textContent = EXCEL_PLACEHOLDER;
  }

  // 업로드된 파일 목록 업데이트
  updateRequiredFilesList();

  // 모든 필수 파일이 업로드되었는지 확인 (업로드 완료 후 약간의 지연을 두고 확인)
  setTimeout(() => {
    checkAllFilesUploaded();
  }, 500);

  if (submitButton) submitButton.disabled = false;
}

// Container용 Excel 업로드 핸들러
async function handleContainerExcelUpload(event) {
  event.preventDefault();

  const containerExcelInput = document.getElementById('container-excel-file-input');
  const containerExcelForm = document.getElementById('container-excel-upload-form');
  const containerExcelFeedback = document.getElementById('container-excel-upload-feedback');
  const containerExcelFileName = document.getElementById('container-excel-file-name');

  if (!containerExcelInput || !containerExcelForm) return;

  const { files } = containerExcelInput;
  if (!files || files.length === 0) {
    showFeedback(containerExcelFeedback, '업로드할 Excel 파일을 선택하세요.', true);
    return;
  }

  const submitButton = containerExcelForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  let successCount = 0;
  let errorCount = 0;

  // 모든 파일 업로드
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '업로드 실패' }));
        throw new Error(error.error || '업로드 중 오류가 발생했습니다.');
      }

      successCount++;
    } catch (error) {
      console.error(`파일 ${file.name} 업로드 오류:`, error);
      errorCount++;
    }
  }

  // 결과 메시지
  if (successCount > 0) {
    showFeedback(containerExcelFeedback, `${successCount}개 파일 업로드 완료!${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`, false);
  } else {
    showFeedback(containerExcelFeedback, '모든 파일 업로드에 실패했습니다.', true);
  }

  containerExcelInput.value = '';
  if (containerExcelFileName) {
    containerExcelFileName.textContent = 'Select files';
  }

  if (submitButton) submitButton.disabled = false;
}

function updateRequiredFilesList() {
  const fileListItems = document.querySelectorAll('#required-files-list li');
  fileListItems.forEach(li => {
    const fileName = li.dataset.file;
    if (uploadedFiles.has(fileName)) {
      li.classList.add('uploaded');
    } else {
      li.classList.remove('uploaded');
    }
  });
}

function renderRequiredFilesList() {
  const list = document.querySelector('#required-files-list');
  if (!list) return;
  list.innerHTML = REQUIRED_FILES.map(file => `<li data-file="${file}">${file}</li>`).join('');
}

async function checkAllFilesUploaded() {
  // 서버에서 업로드된 파일 목록 확인
  try {
    const response = await fetch(`${API_BASE_URL}/datasets`);
    if (!response.ok) return;
    
    const datasets = await response.json();
    const uploadedFileNames = new Set(datasets.map(d => d.original_filename));
    
    // 업로드된 파일 목록 업데이트
    uploadedFiles = uploadedFileNames;
    updateRequiredFilesList();
    
    // 모든 필수 파일이 업로드되었는지 확인
    const allUploaded = REQUIRED_FILES.every(file => uploadedFileNames.has(file));
    
    if (allUploaded) {
      showFeedback(elements.excelFeedback, '모든 필수 파일이 업로드되었습니다! 그래프 페이지를 엽니다.', false);
      // 새 창에서 그래프 페이지 열기
      setTimeout(() => {
        window.open('charts.html', '_blank', 'width=1400,height=900');
      }, 1000);
    } else {
      const uploadedCount = REQUIRED_FILES.filter(file => uploadedFileNames.has(file)).length;
      const totalCount = REQUIRED_FILES.length;
      showFeedback(elements.excelFeedback, `업로드된 파일: ${uploadedCount}/${totalCount}개`, false);
    }
  } catch (error) {
    console.error('파일 목록 확인 오류:', error);
  }
}

function setupExcelUpload() {
  if (!elements.excelForm || !elements.excelInput) return;

  elements.excelForm.addEventListener('submit', handleExcelUpload);
  elements.excelInput.addEventListener('change', () => {
    const fileName = elements.excelInput.files?.[0]?.name ?? EXCEL_PLACEHOLDER;
    if (elements.excelFileName) {
      elements.excelFileName.textContent = fileName;
    }
  });

  if (elements.excelLabel) {
    elements.excelLabel.addEventListener('click', (event) => {
      event.preventDefault();
      elements.excelInput?.click();
    });
  }
}

// ==================== DOCX 업로드 (보고서) ====================
function setupDocxUploads() {
  if (!docxForms || docxForms.length === 0) return;

  docxForms.forEach((form, index) => {
    const fileInput = form.querySelector('.docx-file-input');
    const fileLabel = form.querySelector('.docx-file-label');
    const fileNameEl = form.querySelector('.docx-file-name');
    const feedbackEl = form.closest('.docx-upload-item')?.querySelector('.docx-upload-feedback');
    const category = form.dataset.category;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!fileInput || !category) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const { files } = fileInput;
      if (!files || files.length === 0) {
        showFeedback(feedbackEl, '업로드할 DOCX 파일을 선택하세요.', true);
        return;
      }

      const file = files[0];
      const lowerName = file.name.toLowerCase();
      const ext = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
      if (!REPORT_ALLOWED_EXTENSIONS.includes(ext)) {
        showFeedback(feedbackEl, 'HTML 또는 JSON 파일만 업로드 가능합니다.', true);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      showFeedback(feedbackEl, 'DOCX 보고서를 업로드하는 중입니다...', false);
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${API_BASE_URL}/upload/text`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: '업로드 실패' }));
          throw new Error(error.error || 'DOCX 업로드에 실패했습니다.');
        }

        await response.json();
        showFeedback(feedbackEl, 'DOCX 업로드가 완료되었습니다!', false);

        fileInput.value = '';
        if (fileNameEl) {
          fileNameEl.textContent = DOCX_PLACEHOLDER;
        }
      } catch (error) {
        console.error(error);
        showFeedback(feedbackEl, error.message || 'DOCX 업로드에 실패했습니다.', true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    fileInput.addEventListener('change', () => {
      const fileName = fileInput.files?.[0]?.name ?? DOCX_PLACEHOLDER;
      if (fileNameEl) {
        fileNameEl.textContent = fileName;
      }
    });

    if (fileLabel) {
      fileLabel.addEventListener('click', (event) => {
        event.preventDefault();
        fileInput.click();
      });
    }
  });
}

// ==================== PDF 업로드 & 미리보기 ====================
async function handlePdfUpload(event) {
  event.preventDefault();

  if (!elements.pdfInput || !elements.pdfForm) return;

  const { files } = elements.pdfInput;
  if (!files || files.length === 0) {
    showFeedback(elements.pdfFeedback, '업로드할 PDF 파일을 선택하세요.', true);
    return;
  }

  const submitButton = elements.pdfForm.querySelector('button[type="submit"]');
  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);

  showFeedback(elements.pdfFeedback, 'PDF를 업로드하는 중입니다...', false);
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/upload/pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '업로드 실패' }));
      throw new Error(error.error || 'PDF 업로드에 실패했습니다.');
    }

    const payload = await response.json();
    showFeedback(elements.pdfFeedback, 'PDF 업로드가 완료되었습니다!', false);

    elements.pdfInput.value = '';
    if (elements.pdfFileName) {
      elements.pdfFileName.textContent = PDF_PLACEHOLDER;
    }

    await loadPdfs(payload.pdf?.id);
    if (payload.pdf?.full_text) {
      updatePdfPreview(payload.pdf);
    }
  } catch (error) {
    console.error(error);
    showFeedback(elements.pdfFeedback, error.message || 'PDF 업로드에 실패했습니다.', true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function setupPdfUpload() {
  if (!elements.pdfForm || !elements.pdfInput) return;

  elements.pdfForm.addEventListener('submit', handlePdfUpload);
  elements.pdfInput.addEventListener('change', () => {
    const fileName = elements.pdfInput.files?.[0]?.name ?? PDF_PLACEHOLDER;
    if (elements.pdfFileName) {
      elements.pdfFileName.textContent = fileName;
    }
  });

  if (elements.pdfLabel) {
    elements.pdfLabel.addEventListener('click', (event) => {
      event.preventDefault();
      elements.pdfInput?.click();
    });
  }
}

async function loadPdfs(activeId = null) {
  if (!elements.pdfList) return;

  try {
    const response = await fetch(`${API_BASE_URL}/pdfs`);
    if (!response.ok) {
      throw new Error('PDF 목록을 불러오지 못했습니다.');
    }

    const items = await response.json();
    pdfState.items = Array.isArray(items) ? items : [];

    if (activeId) {
      pdfState.activeId = activeId;
    } else if (!pdfState.activeId && pdfState.items.length) {
      pdfState.activeId = pdfState.items[0].id;
    } else if (!pdfState.items.length) {
      pdfState.activeId = null;
    }

    renderPdfList();

    if (pdfState.activeId) {
      await displayPdf(pdfState.activeId);
    } else {
      clearPdfPreview('Select a PDF to see the extracted text preview.');
    }
  } catch (error) {
    console.error(error);
    showFeedback(elements.pdfFeedback, error.message || 'PDF 목록을 불러오지 못했습니다.', true);
    pdfState.items = [];
    pdfState.activeId = null;
    renderPdfList();
    clearPdfPreview('PDF 목록을 불러오지 못했습니다.');
  }
}

function renderPdfList() {
  if (!elements.pdfList) return;

  elements.pdfList.innerHTML = '';

  if (!pdfState.items.length) {
    const empty = document.createElement('li');
    empty.className = 'pdf-list-empty';
    empty.textContent = '업로드된 PDF가 없습니다.';
    elements.pdfList.appendChild(empty);
    return;
  }

  pdfState.items.forEach((pdf) => {
    const li = document.createElement('li');
    li.dataset.pdfId = pdf.id;
    li.className = pdfState.activeId === pdf.id ? 'active' : '';
    li.innerHTML = `
      <strong>${pdf.original_filename}</strong>
      <small>${formatDate(pdf.uploaded_at)} · ${pdf.page_count}p</small>
    `;

    li.addEventListener('click', () => {
      if (pdfState.activeId === pdf.id) return;
      pdfState.activeId = pdf.id;
      renderPdfList();
      displayPdf(pdf.id);
    });

    elements.pdfList.appendChild(li);
  });
}

function clearPdfPreview(message = 'Select a PDF to see the extracted text preview.') {
  if (elements.pdfPreviewTitle) {
    elements.pdfPreviewTitle.textContent = 'Preview';
  }

  if (elements.pdfPreviewMeta) {
    elements.pdfPreviewMeta.innerHTML = '';
  }

  if (elements.pdfPreviewText) {
    elements.pdfPreviewText.textContent = message;
    elements.pdfPreviewText.classList.add('pdf-preview-empty');
  }
}

async function displayPdf(pdfId) {
  if (!pdfId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/pdfs/${pdfId}`);
    if (!response.ok) {
      throw new Error('PDF 정보를 불러오지 못했습니다.');
    }

    const payload = await response.json();
    if (!payload || !payload.pdf) {
      throw new Error('PDF 데이터를 찾을 수 없습니다.');
    }

    updatePdfPreview(payload.pdf);
  } catch (error) {
    console.error(error);
    showFeedback(elements.pdfFeedback, error.message || 'PDF 정보를 불러오지 못했습니다.', true);
  }
}

function updatePdfPreview(pdf) {
  if (elements.pdfPreviewTitle) {
    elements.pdfPreviewTitle.textContent = pdf.original_filename || 'Preview';
  }

  if (elements.pdfPreviewMeta) {
    const metaParts = [
      `<span><strong>용량</strong> ${formatFileSize(pdf.file_size_kb)}</span>`,
      `<span><strong>페이지</strong> ${pdf.page_count ?? '-'}p</span>`,
      `<span><strong>업로드</strong> ${formatDate(pdf.uploaded_at) || '-'}</span>`,
    ];
    elements.pdfPreviewMeta.innerHTML = metaParts.join('');
  }

  if (elements.pdfPreviewText) {
    elements.pdfPreviewText.textContent = pdf.full_text || pdf.preview_text || '[텍스트 추출 불가]';
    elements.pdfPreviewText.classList.remove('pdf-preview-empty');
  }
}

// ==================== 그래프 데이터 로드 ====================
async function loadChartData() {
  try {
    const response = await fetch(`${API_BASE_URL}/charts/data`);
    if (!response.ok) {
      throw new Error('그래프 데이터를 불러오지 못했습니다.');
    }
    
    const chartData = await response.json();
    
    // Dry Bulk Trade 그래프
    if (chartData.drybulk_trade && chartData.drybulk_trade.length > 0) {
      initGroupChart('drybulkTradeChart', chartData.drybulk_trade, 'Dry Bulk Trade');
    }
    
    // Fleet Development 그래프
    if (chartData.fleet_development && chartData.fleet_development.length > 0) {
      initGroupChart('fleetDevelopmentChart', chartData.fleet_development, 'Fleet Development');
    }
    
    // Indices 그래프
    if (chartData.indices && chartData.indices.length > 0) {
      initGroupChart('indicesChart', chartData.indices, 'Indices');
    }
  } catch (error) {
    console.error('그래프 데이터 로드 오류:', error);
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
  const colors = ['#1e40af', '#059669', '#dc2626', '#f59e0b'];
  
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
        
        datasetsConfig.push({
          label: `${dataset.filename} - ${col}`,
          data: dateIndices.map((x, i) => ({ x, y: values[i] })),
          borderColor: colors[(idx * dataCols.length + colIdx) % colors.length],
          backgroundColor: colors[(idx * dataCols.length + colIdx) % colors.length] + '40',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
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
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
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
          ticks: {
            callback: function(value, index) {
              if (sortedDates[index]) {
                const date = new Date(sortedDates[index]);
                return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
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
        },
      },
    },
  });
}

// ==================== Excel 업로드 설정 ====================
function setupExcelUpload() {
  if (!elements.excelForm) return;
  elements.excelForm.addEventListener('submit', handleExcelUpload);
}

// ==================== Container Excel 업로드 ====================
async function handleContainerExcelUpload(event) {
  event.preventDefault();

  const containerExcelForm = document.getElementById('container-excel-upload-form');
  const containerExcelInput = document.getElementById('container-excel-file-input');
  const containerExcelFeedback = document.getElementById('container-excel-upload-feedback');
  const containerExcelBtn = document.getElementById('container-excel-upload-btn');

  if (!containerExcelInput || !containerExcelForm) return;

  const { files } = containerExcelInput;
  if (!files || files.length === 0) {
    showFeedback(containerExcelFeedback, '업로드할 Excel 파일을 선택하세요.', true);
    return;
  }

  if (containerExcelBtn) containerExcelBtn.disabled = true;

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '업로드 실패' }));
        throw new Error(errorData.error || '업로드 실패');
      }

      successCount++;
    } catch (error) {
      console.error('Container Excel 업로드 오류:', error);
      errorCount++;
    }
  }

  if (containerExcelBtn) containerExcelBtn.disabled = false;

  if (successCount > 0 && errorCount === 0) {
    showFeedback(containerExcelFeedback, `${successCount}개 파일 업로드 완료!`, false);
    containerExcelInput.value = '';
    if (document.getElementById('container-excel-file-name')) {
      document.getElementById('container-excel-file-name').textContent = 'Excel 파일 선택';
    }
  } else if (errorCount > 0) {
    showFeedback(containerExcelFeedback, `${errorCount}개 파일 업로드 실패.`, true);
  }
}

// ==================== DOCX/HTML/JSON 업로드 설정 ====================
function setupDocxUploads() {
  const docxForms = document.querySelectorAll('.docx-upload-form');
  
  docxForms.forEach((form) => {
    const category = form.getAttribute('data-category');
    const fileInput = form.querySelector('.docx-file-input');
    const fileLabel = form.querySelector('.docx-file-label');
    const fileNameSpan = form.querySelector('.docx-file-name');
    const feedback = form.querySelector('.docx-upload-feedback');

    if (fileLabel && fileInput) {
      fileLabel.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
      });
    }

    if (fileInput && fileNameSpan) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          fileNameSpan.textContent = fileInput.files[0].name;
        } else {
          fileNameSpan.textContent = DOCX_PLACEHOLDER;
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showFeedback(feedback, '파일을 선택하세요.', true);
        return;
      }

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE_URL}/upload/text`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '업로드 실패' }));
          throw new Error(errorData.error || '업로드 실패');
        }

        showFeedback(feedback, '업로드 완료!', false);
        fileInput.value = '';
        if (fileNameSpan) fileNameSpan.textContent = DOCX_PLACEHOLDER;
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        showFeedback(feedback, error.message || '업로드 중 오류가 발생했습니다.', true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

// ==================== PDF 업로드 설정 ====================
function setupPdfUpload() {
  if (!elements.pdfForm) return;
  // PDF 업로드는 필요시 구현
}

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', () => {
  renderRequiredFilesList();
  setupExcelUpload();
  setupDocxUploads();
  setupPdfUpload();
  loadPdfs();
  checkAllFilesUploaded(); // 페이지 로드 시 업로드 상태 확인
  
  // 파일 입력 변경 시 파일명 표시
  if (elements.excelInput) {
    elements.excelInput.addEventListener('change', () => {
      const files = elements.excelInput.files;
      if (files && files.length > 0) {
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        if (elements.excelFileName) {
          elements.excelFileName.textContent = `${files.length}개 파일 선택됨: ${fileNames.substring(0, 50)}${fileNames.length > 50 ? '...' : ''}`;
        }
      } else {
        if (elements.excelFileName) {
          elements.excelFileName.textContent = EXCEL_PLACEHOLDER;
        }
      }
    });
  }

  // Container Excel 업로드 폼 이벤트 리스너
  const containerExcelForm = document.getElementById('container-excel-upload-form');
  const containerExcelInput = document.getElementById('container-excel-file-input');
  const containerExcelFileName = document.getElementById('container-excel-file-name');

  if (containerExcelForm) {
    containerExcelForm.addEventListener('submit', handleContainerExcelUpload);
  }

  if (containerExcelInput && containerExcelFileName) {
    containerExcelInput.addEventListener('change', () => {
      const files = containerExcelInput.files;
      if (files && files.length > 0) {
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        containerExcelFileName.textContent = `${files.length}개 파일 선택됨: ${fileNames.substring(0, 50)}${fileNames.length > 50 ? '...' : ''}`;
      } else {
        containerExcelFileName.textContent = 'Select files';
      }
    });
  }
});
