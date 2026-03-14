"use strict";

(() => {
  const EDITABLE_SELECTOR = [
    "textarea",
    "input",
    "[contenteditable='']",
    "[contenteditable='true']",
    "[contenteditable='plaintext-only']"
  ].join(",");

  function getNodeElement(node) {
    if (!node) {
      return null;
    }

    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  function isSelectionInEditableArea(selection) {
    const anchorElement = getNodeElement(selection.anchorNode);
    const focusElement = getNodeElement(selection.focusNode);

    return Boolean(
      anchorElement?.closest(EDITABLE_SELECTOR) ||
        focusElement?.closest(EDITABLE_SELECTOR)
    );
  }

  function hasRenderableText(range) {
    return range.toString().trim().length > 0;
  }

  function getCurrentSelectionRange() {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    if (isSelectionInEditableArea(selection)) {
      return null;
    }

    const currentRange = selection.getRangeAt(0);
    if (!hasRenderableText(currentRange)) {
      return null;
    }

    return currentRange.cloneRange();
  }

  globalThis.SimpleHighlightsSelection = Object.freeze({
    getCurrentSelectionRange
  });
})();
