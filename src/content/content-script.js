"use strict";

(() => {
  const selectionModule = globalThis.SimpleHighlightsSelection;
  const stateModule = globalThis.SimpleHighlightsState;
  const highlighterModule = globalThis.SimpleHighlightsHighlighter;
  const toolbarModule = globalThis.SimpleHighlightsFloatingToolbar;
  const libraryModule = globalThis.SimpleHighlightsLibrary;

  if (!selectionModule || !stateModule || !highlighterModule || !toolbarModule || !libraryModule) {
    return;
  }

  let selectedRangeForAction = null;
  let hoveredHighlightId = "";
  let hideDeleteButtonTimeoutId = 0;

  const toolbar = toolbarModule.createFloatingToolbar({
    onHighlight: applyHighlight,
    onSelectColor: selectHighlightColor,
    getCurrentColor: stateModule.getSelectedColor,
    getPalette: stateModule.getColorPalette
  });

  const deleteButton = createDeleteButton();

  function createDeleteButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "x";
    button.setAttribute("aria-label", "Eliminar subrayado");
    button.style.position = "fixed";
    button.style.left = "0";
    button.style.top = "0";
    button.style.zIndex = "2147483647";
    button.style.display = "none";
    button.style.border = "1px solid rgba(15, 23, 42, 0.14)";
    button.style.borderRadius = "999px";
    button.style.background = "#ffffff";
    button.style.boxShadow = "0 10px 22px rgba(15, 23, 42, 0.18)";
    button.style.color = "#0f172a";
    button.style.cursor = "pointer";
    button.style.fontFamily = '"Segoe UI", Tahoma, sans-serif';
    button.style.fontSize = "14px";
    button.style.fontWeight = "600";
    button.style.width = "28px";
    button.style.height = "28px";
    button.style.padding = "0";
    button.style.lineHeight = "1";
    button.style.display = "none";

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });

    button.addEventListener("mouseenter", () => {
      window.clearTimeout(hideDeleteButtonTimeoutId);
    });

    button.addEventListener("mouseleave", () => {
      scheduleDeleteButtonHide();
    });

    button.addEventListener("click", async () => {
      if (!hoveredHighlightId) {
        return;
      }

      highlighterModule.removeHighlightById(hoveredHighlightId);
      await libraryModule.removeHighlight(hoveredHighlightId);
      highlighterModule.setHoverState(hoveredHighlightId, false);
      hoveredHighlightId = "";
      hideDeleteButton();
    });

    document.documentElement.appendChild(button);
    return button;
  }

  function getHighlightIdFromElement(element) {
    return element?.getAttribute("data-simple-highlight-id") || "";
  }

  function getClosestHighlightElement(targetNode) {
    return targetNode instanceof Element
      ? targetNode.closest("[data-simple-highlight='true']")
      : null;
  }

  function hideDeleteButton() {
    if (hoveredHighlightId) {
      highlighterModule.setHoverState(hoveredHighlightId, false);
    }

    hoveredHighlightId = "";
    deleteButton.style.display = "none";
  }

  function scheduleDeleteButtonHide() {
    window.clearTimeout(hideDeleteButtonTimeoutId);
    hideDeleteButtonTimeoutId = window.setTimeout(() => {
      hideDeleteButton();
    }, 120);
  }

  function showDeleteButtonForHighlight(highlightElement) {
    const highlightId = getHighlightIdFromElement(highlightElement);
    if (!highlightId) {
      return;
    }

    window.clearTimeout(hideDeleteButtonTimeoutId);

    if (hoveredHighlightId && hoveredHighlightId !== highlightId) {
      highlighterModule.setHoverState(hoveredHighlightId, false);
    }

    hoveredHighlightId = highlightId;
    highlighterModule.setHoverState(highlightId, true);

    const targetRect = highlightElement.getBoundingClientRect();
    const margin = 8;

    deleteButton.style.display = "block";

    const buttonRect = deleteButton.getBoundingClientRect();
    const desiredTop = targetRect.top - buttonRect.height - margin;
    const fallbackTop = targetRect.bottom + margin;
    const top = desiredTop >= margin ? desiredTop : fallbackTop;
    const left = Math.min(
      Math.max(margin, targetRect.left),
      Math.max(margin, window.innerWidth - buttonRect.width - margin)
    );

    deleteButton.style.left = `${left}px`;
    deleteButton.style.top = `${Math.max(margin, top)}px`;
  }

  function getSelectionRect(range) {
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return rect;
    }

    const clientRects = range.getClientRects();
    if (clientRects.length > 0) {
      return clientRects[0];
    }

    return null;
  }

  function showToolbarForSelection() {
    const selectedRange = selectionModule.getCurrentSelectionRange();
    if (!selectedRange) {
      selectedRangeForAction = null;
      toolbar.hide();
      return;
    }

    const selectionRect = getSelectionRect(selectedRange);
    if (!selectionRect) {
      selectedRangeForAction = null;
      toolbar.hide();
      return;
    }

    selectedRangeForAction = selectedRange;
    toolbar.showAtRect(selectionRect);
  }

  function scheduleToolbarRefresh() {
    window.setTimeout(showToolbarForSelection, 0);
  }

  function handleMouseUp(event) {
    if (toolbar.containsEventTarget(event.target)) {
      return;
    }

    scheduleToolbarRefresh();
  }

  async function selectHighlightColor(colorValue) {
    await stateModule.setSelectedColor(colorValue);
  }

  async function saveHighlightRecord(highlightId, selectedText, selectedColor) {
    await libraryModule.addHighlight({
      id: highlightId,
      url: window.location.href,
      pageTitle: document.title,
      text: selectedText,
      color: selectedColor
    });
  }

  function applyHighlight() {
    if (!selectedRangeForAction) {
      return;
    }

    const selectedText = selectedRangeForAction.toString().trim();
    const selectedColor = stateModule.getSelectedColor().value;
    const highlightId = libraryModule.createHighlightId();
    const highlightedSegments = highlighterModule.highlightRange(
      selectedRangeForAction,
      selectedColor,
      highlightId
    );

    if (highlightedSegments > 0) {
      saveHighlightRecord(highlightId, selectedText, selectedColor);
      selectedRangeForAction = null;
      window.getSelection()?.removeAllRanges();
      toolbar.hide();
    }
  }

  function handleDocumentMouseDown(event) {
    if (toolbar.containsEventTarget(event.target) || event.target === deleteButton) {
      return;
    }

    toolbar.hide();
    hideDeleteButton();
  }

  function handleDocumentScroll() {
    if (toolbar.isVisible()) {
      toolbar.hide();
    }

    hideDeleteButton();
  }

  function handleKeyUp(event) {
    const selectionKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift"];

    if (selectionKeys.includes(event.key) || event.shiftKey) {
      scheduleToolbarRefresh();
    }
  }

  function handlePointerOver(event) {
    const highlightElement = getClosestHighlightElement(event.target);
    if (!highlightElement) {
      return;
    }

    showDeleteButtonForHighlight(highlightElement);
  }

  function handlePointerOut(event) {
    const highlightElement = getClosestHighlightElement(event.target);
    if (!highlightElement) {
      return;
    }

    const nextTarget = event.relatedTarget;
    if (nextTarget === deleteButton) {
      return;
    }

    if (getClosestHighlightElement(nextTarget)) {
      return;
    }

    scheduleDeleteButtonHide();
  }

  stateModule.initialize().then(() => {
    toolbar.updateColorLabel();
  });

  document.addEventListener("mouseup", handleMouseUp, { passive: true });
  document.addEventListener("keyup", handleKeyUp, { passive: true });
  document.addEventListener("mousedown", handleDocumentMouseDown, { passive: true });
  document.addEventListener("mouseover", handlePointerOver, { passive: true });
  document.addEventListener("mouseout", handlePointerOut, { passive: true });
  document.addEventListener("scroll", handleDocumentScroll, true);
  window.addEventListener("resize", handleDocumentScroll, { passive: true });

})();
