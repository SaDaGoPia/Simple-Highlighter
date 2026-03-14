"use strict";

(() => {
  const PREFERENCES_STORAGE_KEY = "simpleHighlightsPopupPreferences";
  const libraryRoot = document.getElementById("library-content");
  const searchInput = document.getElementById("library-search");
  const sortModeButton = document.getElementById("sort-mode-button");
  const groupToggleButton = document.getElementById("group-toggle-button");
  const libraryModule = globalThis.SimpleHighlightsLibrary;
  let allItems = [];
  let currentQuery = "";
  let currentSortMode = "relevance";
  let groupBySiteEnabled = true;

  const SORT_MODES = [
    {
      id: "relevance",
      label: "Relevancia"
    },
    {
      id: "newest",
      label: "Mas recientes"
    },
    {
      id: "oldest",
      label: "Mas antiguos"
    },
    {
      id: "site-az",
      label: "Sitio A-Z"
    }
  ];

  if (!libraryRoot || !searchInput || !sortModeButton || !groupToggleButton || !libraryModule) {
    return;
  }

  function formatDate(isoValue) {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
      return "Fecha desconocida";
    }

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function createElement(tagName, className, textValue) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }

    if (typeof textValue === "string") {
      element.textContent = textValue;
    }

    return element;
  }

  function groupByHostname(items) {
    const grouped = new Map();

    for (const item of items) {
      const host = item.hostname || "unknown-site";
      if (!grouped.has(host)) {
        grouped.set(host, []);
      }

      grouped.get(host).push(item);
    }

    return grouped;
  }

  function normalizeForSearch(inputText) {
    if (typeof inputText !== "string") {
      return "";
    }

    return inputText
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-ES")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function parseDateValue(isoValue) {
    const parsed = Date.parse(isoValue || "");
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function getSortModeById(sortModeId) {
    return SORT_MODES.find((mode) => mode.id === sortModeId) || SORT_MODES[0];
  }

  async function loadPopupPreferences() {
    if (!chrome?.storage?.local) {
      return;
    }

    try {
      const storageData = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const preferences = storageData?.[PREFERENCES_STORAGE_KEY];

      if (!preferences || typeof preferences !== "object") {
        return;
      }

      const sortMode = getSortModeById(preferences.sortMode).id;
      currentSortMode = sortMode;

      if (typeof preferences.groupBySiteEnabled === "boolean") {
        groupBySiteEnabled = preferences.groupBySiteEnabled;
      }
    } catch (error) {
      console.warn("No se pudieron cargar las preferencias del popup.", error);
    }
  }

  async function savePopupPreferences() {
    if (!chrome?.storage?.local) {
      return;
    }

    try {
      await chrome.storage.local.set({
        [PREFERENCES_STORAGE_KEY]: {
          sortMode: currentSortMode,
          groupBySiteEnabled
        }
      });
    } catch (error) {
      console.warn("No se pudieron guardar las preferencias del popup.", error);
    }
  }

  function updateControlLabels() {
    const sortMode = getSortModeById(currentSortMode);
    sortModeButton.textContent = `Orden: ${sortMode.label}`;

    groupToggleButton.textContent = groupBySiteEnabled ? "Agrupar: Sitio" : "Agrupar: Ninguno";
    groupToggleButton.setAttribute("aria-pressed", String(groupBySiteEnabled));
  }

  function renderEmptyState() {
    libraryRoot.textContent = "";
    const emptyCard = createElement(
      "div",
      "empty-state",
      "Aun no hay subrayados guardados. Selecciona texto en cualquier pagina y pulsa Highlight."
    );
    libraryRoot.appendChild(emptyCard);
  }

  function renderNoSearchResults(queryText) {
    libraryRoot.textContent = "";
    const emptyCard = createElement(
      "div",
      "empty-state",
      `No hay resultados para "${queryText}".`
    );
    libraryRoot.appendChild(emptyCard);
  }

  function normalizeSearchQuery(inputText) {
    return normalizeForSearch(inputText);
  }

  function computeSearchScore(item, queryText) {
    if (!queryText) {
      return 0;
    }

    const normalizedText = normalizeForSearch(item?.text || "");
    const normalizedTitle = normalizeForSearch(item?.pageTitle || "");
    const normalizedHost = normalizeForSearch(item?.hostname || "");
    const normalizedUrl = normalizeForSearch(item?.url || "");
    const mergedSearchable = [normalizedText, normalizedTitle, normalizedHost, normalizedUrl]
      .filter(Boolean)
      .join(" ");

    if (!mergedSearchable) {
      return -1;
    }

    const queryTokens = queryText.split(" ").filter(Boolean);
    if (queryTokens.length === 0) {
      return 0;
    }

    for (const token of queryTokens) {
      if (!mergedSearchable.includes(token)) {
        return -1;
      }
    }

    let score = 0;

    if (normalizedText.includes(queryText)) {
      score += 10;
    }

    if (normalizedTitle.includes(queryText)) {
      score += 7;
    }

    if (normalizedHost.includes(queryText)) {
      score += 5;
    }

    if (normalizedUrl.includes(queryText)) {
      score += 3;
    }

    score += queryTokens.reduce((acc, token) => {
      if (normalizedText.includes(token)) {
        return acc + 3;
      }

      if (normalizedTitle.includes(token)) {
        return acc + 2;
      }

      if (normalizedHost.includes(token) || normalizedUrl.includes(token)) {
        return acc + 1;
      }

      return acc;
    }, 0);

    return score;
  }

  function getSortableItems(items, queryText) {
    const scoredItems = items
      .map((item) => ({
        item,
        score: computeSearchScore(item, queryText)
      }))
      .filter((entry) => !queryText || entry.score >= 0);

    const sortMode = getSortModeById(currentSortMode).id;

    if (sortMode === "oldest") {
      scoredItems.sort((left, right) => {
        return parseDateValue(left.item?.createdAt) - parseDateValue(right.item?.createdAt);
      });
      return scoredItems.map((entry) => entry.item);
    }

    if (sortMode === "site-az") {
      scoredItems.sort((left, right) => {
        const leftHost = (left.item?.hostname || "").toLocaleLowerCase("es-ES");
        const rightHost = (right.item?.hostname || "").toLocaleLowerCase("es-ES");

        const byHost = leftHost.localeCompare(rightHost, "es");
        if (byHost !== 0) {
          return byHost;
        }

        return parseDateValue(right.item?.createdAt) - parseDateValue(left.item?.createdAt);
      });
      return scoredItems.map((entry) => entry.item);
    }

    if (sortMode === "relevance" && queryText) {
      scoredItems.sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return parseDateValue(right.item?.createdAt) - parseDateValue(left.item?.createdAt);
      });
      return scoredItems.map((entry) => entry.item);
    }

    scoredItems.sort((left, right) => {
      return parseDateValue(right.item?.createdAt) - parseDateValue(left.item?.createdAt);
    });
    return scoredItems.map((entry) => entry.item);
  }

  function renderFlatList(items) {
    libraryRoot.textContent = "";

    for (const entry of items) {
      const itemCard = createElement("div", "highlight-item");

      const row = createElement("div", "item-row");
      const colorDot = createElement("span", "color-dot");
      colorDot.style.backgroundColor = entry.color || "#fae082";

      const itemTitle = createElement("p", "item-title", entry.pageTitle || "Untitled page");

      row.appendChild(colorDot);
      row.appendChild(itemTitle);

      const itemText = createElement("p", "item-text", `"${entry.text}"`);
      const meta = createElement("p", "item-meta", `${entry.hostname || "unknown-site"} · ${formatDate(entry.createdAt)}`);

      itemCard.appendChild(row);
      itemCard.appendChild(itemText);
      itemCard.appendChild(meta);

      libraryRoot.appendChild(itemCard);
    }
  }

  function renderCurrentView() {
    if (allItems.length === 0) {
      renderEmptyState();
      return;
    }

    const filteredItems = getSortableItems(allItems, currentQuery);
    if (filteredItems.length === 0) {
      renderNoSearchResults(searchInput.value.trim());
      return;
    }

    if (!groupBySiteEnabled) {
      renderFlatList(filteredItems);
      return;
    }

    renderLibrary(filteredItems);
  }

  function renderLibrary(items) {
    libraryRoot.textContent = "";

    if (items.length === 0) {
      renderEmptyState();
      return;
    }

    const groupedLibrary = groupByHostname(items);

    for (const [hostname, entries] of groupedLibrary.entries()) {
      const groupCard = createElement("article", "site-group");
      const groupTitle = createElement("h2", "site-title", hostname);
      groupCard.appendChild(groupTitle);

      for (const entry of entries) {
        const itemCard = createElement("div", "highlight-item");

        const row = createElement("div", "item-row");
        const colorDot = createElement("span", "color-dot");
        colorDot.style.backgroundColor = entry.color || "#fae082";

        const itemTitle = createElement("p", "item-title", entry.pageTitle || "Untitled page");

        row.appendChild(colorDot);
        row.appendChild(itemTitle);

        const itemText = createElement("p", "item-text", `"${entry.text}"`);
        const meta = createElement("p", "item-meta", formatDate(entry.createdAt));

        itemCard.appendChild(row);
        itemCard.appendChild(itemText);
        itemCard.appendChild(meta);

        groupCard.appendChild(itemCard);
      }

      libraryRoot.appendChild(groupCard);
    }
  }

  async function bootstrap() {
    await loadPopupPreferences();
    updateControlLabels();

    allItems = await libraryModule.getLibrary();
    renderCurrentView();
  }

  searchInput.addEventListener("input", () => {
    currentQuery = normalizeSearchQuery(searchInput.value);
    renderCurrentView();
  });

  sortModeButton.addEventListener("click", () => {
    const currentIndex = SORT_MODES.findIndex((mode) => mode.id === currentSortMode);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % SORT_MODES.length;
    currentSortMode = SORT_MODES[nextIndex].id;
    updateControlLabels();
    renderCurrentView();
    savePopupPreferences();
  });

  groupToggleButton.addEventListener("click", () => {
    groupBySiteEnabled = !groupBySiteEnabled;
    updateControlLabels();
    renderCurrentView();
    savePopupPreferences();
  });

  updateControlLabels();

  bootstrap();
})();
