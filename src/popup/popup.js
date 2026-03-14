"use strict";

(() => {
  const libraryRoot = document.getElementById("library-content");
  const libraryModule = globalThis.SimpleHighlightsLibrary;

  if (!libraryRoot || !libraryModule) {
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

  function renderEmptyState() {
    libraryRoot.textContent = "";
    const emptyCard = createElement(
      "div",
      "empty-state",
      "Aun no hay subrayados guardados. Selecciona texto en cualquier pagina y pulsa Highlight."
    );
    libraryRoot.appendChild(emptyCard);
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
    const items = await libraryModule.getLibrary();
    renderLibrary(items);
  }

  bootstrap();
})();
