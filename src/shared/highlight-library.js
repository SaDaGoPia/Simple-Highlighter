"use strict";

(() => {
  const STORAGE_KEY = "simpleHighlightsLibrary";
  const MAX_TEXT_LENGTH = 1200;
  const MAX_CONTEXT_LENGTH = 120;

  function createHighlightId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function normalizeText(inputText) {
    if (typeof inputText !== "string") {
      return "";
    }

    return inputText.replace(/\s+/g, " ").trim();
  }

  function truncateText(inputText) {
    if (inputText.length <= MAX_TEXT_LENGTH) {
      return inputText;
    }

    return `${inputText.slice(0, MAX_TEXT_LENGTH)}...`;
  }

  function normalizeContext(inputText) {
    const normalized = normalizeText(inputText);
    if (!normalized) {
      return "";
    }

    if (normalized.length <= MAX_CONTEXT_LENGTH) {
      return normalized;
    }

    return normalized.slice(0, MAX_CONTEXT_LENGTH);
  }

  function getHostname(urlValue) {
    try {
      return new URL(urlValue).hostname;
    } catch (_error) {
      return "unknown-site";
    }
  }

  async function getLibrary() {
    if (!chrome?.storage?.local) {
      return [];
    }

    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      const savedItems = data?.[STORAGE_KEY];
      return Array.isArray(savedItems) ? savedItems : [];
    } catch (error) {
      console.warn("No se pudo leer la biblioteca de highlights.", error);
      return [];
    }
  }

  async function saveLibrary(items) {
    if (!chrome?.storage?.local) {
      return;
    }

    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: items });
    } catch (error) {
      console.warn("No se pudo guardar la biblioteca de highlights.", error);
    }
  }

  async function addHighlight(record) {
    const normalizedText = truncateText(normalizeText(record?.text));
    if (!normalizedText) {
      return null;
    }

    const entry = {
      id: typeof record?.id === "string" && record.id ? record.id : createHighlightId(),
      url: typeof record?.url === "string" ? record.url : "",
      hostname: getHostname(record?.url),
      pageTitle: typeof record?.pageTitle === "string" ? record.pageTitle : "Untitled page",
      text: normalizedText,
      color: typeof record?.color === "string" ? record.color : "#fae082",
      prefixContext: normalizeContext(record?.prefixContext),
      suffixContext: normalizeContext(record?.suffixContext),
      createdAt: new Date().toISOString()
    };

    const existingItems = await getLibrary();
    existingItems.unshift(entry);
    await saveLibrary(existingItems);
    return entry;
  }

  async function removeHighlight(highlightId) {
    if (typeof highlightId !== "string" || !highlightId) {
      return;
    }

    const existingItems = await getLibrary();
    const filteredItems = existingItems.filter((item) => item.id !== highlightId);
    await saveLibrary(filteredItems);
  }

  globalThis.SimpleHighlightsLibrary = Object.freeze({
    createHighlightId,
    getLibrary,
    addHighlight,
    removeHighlight
  });
})();
