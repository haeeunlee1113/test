const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl ?? "http://localhost:5000/api";

const state = {
  datasets: [],
  texts: [],
  activeDatasetId: null,
  activeTextId: null,
};

const elements = {
  excelForm: document.querySelector("#excel-form"),
  excelFeedback: document.querySelector("#excel-feedback"),
  datasetList: document.querySelector("#dataset-list"),
  datasetTableContainer: document.querySelector("#dataset-table-container"),
  textForm: document.querySelector("#text-form"),
  textFeedback: document.querySelector("#text-feedback"),
  textList: document.querySelector("#text-list"),
  textPreview: document.querySelector("#text-preview"),
};

async function init() {
  bindEvents();
  await Promise.all([refreshDatasets(), refreshTexts()]);
}

function bindEvents() {
  elements.excelForm?.addEventListener("submit", handleExcelUpload);
  elements.textForm?.addEventListener("submit", handleTextUpload);
}

async function handleExcelUpload(event) {
  event.preventDefault();

  const formData = new FormData(elements.excelForm);
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    showFeedback(elements.excelFeedback, "??? ??????.", true);
    return;
  }

  showFeedback(elements.excelFeedback, "??? ?...", false);

  try {
    const response = await fetch(`${API_BASE_URL}/upload/excel`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "???? ??????." }));
      throw new Error(error.error || response.statusText);
    }

    const payload = await response.json();
    showFeedback(elements.excelFeedback, "???? ???????!", false);
    elements.excelForm.reset();

    await refreshDatasets(payload.dataset.id);
    renderDatasetTable(payload);
  } catch (error) {
    showFeedback(elements.excelFeedback, error.message, true);
    console.error(error);
  }
}

async function handleTextUpload(event) {
  event.preventDefault();

  const formData = new FormData(elements.textForm);
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    showFeedback(elements.textFeedback, "??? ??????.", true);
    return;
  }

  showFeedback(elements.textFeedback, "??? ?...", false);

  try {
    const response = await fetch(`${API_BASE_URL}/upload/text`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "???? ??????." }));
      throw new Error(error.error || response.statusText);
    }

    const payload = await response.json();
    showFeedback(elements.textFeedback, "???? ???????!", false);
    elements.textForm.reset();

    await refreshTexts(payload.text.id);
    await displayText(payload.text.id);
  } catch (error) {
    showFeedback(elements.textFeedback, error.message, true);
    console.error(error);
  }
}

async function refreshDatasets(selectId) {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets`);
    if (!response.ok) throw new Error("???? ??? ???? ?????.");

    state.datasets = await response.json();
    renderDatasetList(selectId ?? state.activeDatasetId);
  } catch (error) {
    console.error(error);
    showFeedback(elements.excelFeedback, error.message, true);
  }
}

async function refreshTexts(selectId) {
  try {
    const response = await fetch(`${API_BASE_URL}/texts`);
    if (!response.ok) throw new Error("??? ??? ???? ?????.");

    state.texts = await response.json();
    renderTextList(selectId ?? state.activeTextId);
  } catch (error) {
    console.error(error);
    showFeedback(elements.textFeedback, error.message, true);
  }
}

function renderDatasetList(selectId) {
  const container = elements.datasetList;
  if (!container) return;

  container.innerHTML = "";

  if (!state.datasets.length) {
    container.innerHTML = `<li>?? ???? ?? ??? ????.</li>`;
    elements.datasetTableContainer.innerHTML = "";
    return;
  }

  state.datasets.forEach((dataset) => {
    const item = document.createElement("li");
    item.dataset.datasetId = dataset.id;
    item.innerHTML = `
      <strong>${dataset.original_filename}</strong>
      <small>${formatDate(dataset.uploaded_at)} ? ${dataset.row_count}? / ${dataset.column_count}?</small>
    `;

    if (dataset.id === selectId) {
      item.classList.add("active");
      state.activeDatasetId = dataset.id;
      displayDataset(dataset.id);
    }

    item.addEventListener("click", () => displayDataset(dataset.id));
    container.append(item);
  });

  if (!state.activeDatasetId && state.datasets.length) {
    displayDataset(state.datasets[0].id);
  }
}

async function displayDataset(datasetId) {
  state.activeDatasetId = datasetId;

  const items = elements.datasetList?.querySelectorAll("li");
  items?.forEach((item) => {
    item.classList.toggle("active", item.dataset.datasetId === datasetId);
  });

  try {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`);
    if (!response.ok) throw new Error("????? ???? ?????.");

    const payload = await response.json();
    renderDatasetTable(payload);
  } catch (error) {
    console.error(error);
    showFeedback(elements.excelFeedback, error.message, true);
  }
}

function renderDatasetTable(payload) {
  const container = elements.datasetTableContainer;
  if (!container) return;

  if (!payload?.data?.length) {
    container.innerHTML = `<p>? ???? ?? ? ????.</p>`;
    return;
  }

  const { data, dataset } = payload;
  const columns = dataset.columns;

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.append(th);
  });

  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  data.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      const value = row[col];
      td.textContent = value ?? "";
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(tbody);
  container.innerHTML = "";
  container.append(table);
}

function renderTextList(selectId) {
  const container = elements.textList;
  if (!container) return;

  container.innerHTML = "";

  if (!state.texts.length) {
    container.innerHTML = `<li>?? ???? ???? ????.</li>`;
    elements.textPreview.innerHTML = "";
    return;
  }

  state.texts.forEach((text) => {
    const item = document.createElement("li");
    item.dataset.textId = text.id;
    item.innerHTML = `
      <strong>${text.original_filename}</strong>
      <small>${formatDate(text.uploaded_at)} ? ${text.content_type.toUpperCase()}</small>
    `;

    if (text.id === selectId) {
      item.classList.add("active");
      state.activeTextId = text.id;
      displayText(text.id);
    }

    item.addEventListener("click", () => displayText(text.id));
    container.append(item);
  });

  if (!state.activeTextId && state.texts.length) {
    displayText(state.texts[0].id);
  }
}

async function displayText(textId) {
  state.activeTextId = textId;

  const items = elements.textList?.querySelectorAll("li");
  items?.forEach((item) => {
    item.classList.toggle("active", item.dataset.textId === textId);
  });

  try {
    const response = await fetch(`${API_BASE_URL}/texts/${textId}`);
    if (!response.ok) throw new Error("???? ???? ?????.");

    const payload = await response.json();
    elements.textPreview.innerHTML = payload.text.html_content;
  } catch (error) {
    console.error(error);
    showFeedback(elements.textFeedback, error.message, true);
  }
}

function showFeedback(target, message, isError) {
  if (!target) return;
  target.textContent = message;
  target.classList.toggle("error", Boolean(isError));
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Intl.DateTimeFormat("ko", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Kick off the app once the DOM is ready (modules run after parsing).
init();
