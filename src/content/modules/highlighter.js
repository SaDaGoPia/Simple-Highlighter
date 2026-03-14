"use strict";

(() => {
  const HIGHLIGHT_ATTRIBUTE = "data-simple-highlight";
  const HIGHLIGHT_ID_ATTRIBUTE = "data-simple-highlight-id";
  const HIGHLIGHT_CLASS = "shl-highlight";
  const DEFAULT_HIGHLIGHT_COLOR = "#fae082";

  function createHighlightElement(textValue, highlightColor, highlightId) {
    const element = document.createElement("span");
    element.className = HIGHLIGHT_CLASS;
    element.setAttribute(HIGHLIGHT_ATTRIBUTE, "true");
    if (highlightId) {
      element.setAttribute(HIGHLIGHT_ID_ATTRIBUTE, highlightId);
    }
    element.style.setProperty("--shl-highlight-color", highlightColor);
    element.textContent = textValue;
    return element;
  }

  function shouldSkipTextNode(textNode) {
    if (!textNode || !textNode.parentElement) {
      return true;
    }

    if (textNode.parentElement.closest(`[${HIGHLIGHT_ATTRIBUTE}='true']`)) {
      return true;
    }

    return textNode.nodeValue.trim().length === 0;
  }

  function collectTextNodesInRange(range) {
    const rootNode =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;

    if (!rootNode) {
      return [];
    }

    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (shouldSkipTextNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodes = [];
    let currentNode = walker.nextNode();

    while (currentNode) {
      nodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    return nodes;
  }

  function buildNodeSegments(range, textNodes) {
    return textNodes
      .map((node) => {
        let startOffset = 0;
        let endOffset = node.nodeValue.length;

        if (node === range.startContainer) {
          startOffset = range.startOffset;
        }

        if (node === range.endContainer) {
          endOffset = range.endOffset;
        }

        if (startOffset >= endOffset) {
          return null;
        }

        return {
          node,
          startOffset,
          endOffset
        };
      })
      .filter(Boolean);
  }

  function wrapTextSegment(node, startOffset, endOffset, highlightColor, highlightId) {
    let targetNode = node;

    if (startOffset > 0) {
      targetNode = targetNode.splitText(startOffset);
    }

    targetNode.splitText(endOffset - startOffset);

    const wrapper = createHighlightElement(targetNode.nodeValue, highlightColor, highlightId);
    targetNode.parentNode.replaceChild(wrapper, targetNode);
    return wrapper;
  }

  function highlightRange(range, selectedColor = DEFAULT_HIGHLIGHT_COLOR, highlightId = "") {
    if (!range || range.collapsed) {
      return 0;
    }

    const textNodes = collectTextNodesInRange(range);
    const nodeSegments = buildNodeSegments(range, textNodes);

    let createdCount = 0;

    // Se recorre en reversa para no invalidar offsets de nodos aun no procesados.
    for (let index = nodeSegments.length - 1; index >= 0; index -= 1) {
      const { node, startOffset, endOffset } = nodeSegments[index];

      if (!node.isConnected) {
        continue;
      }

      wrapTextSegment(node, startOffset, endOffset, selectedColor, highlightId);
      createdCount += 1;
    }

    return createdCount;
  }

  function getHighlightElementsById(highlightId) {
    if (!highlightId) {
      return [];
    }

    return Array.from(document.querySelectorAll(`[${HIGHLIGHT_ID_ATTRIBUTE}="${highlightId}"]`));
  }

  function removeHighlightById(highlightId) {
    const elements = getHighlightElementsById(highlightId);

    for (const element of elements) {
      const parentNode = element.parentNode;
      if (!parentNode) {
        continue;
      }

      const textNode = document.createTextNode(element.textContent || "");
      parentNode.replaceChild(textNode, element);
      parentNode.normalize();
    }

    return elements.length;
  }

  function setHoverState(highlightId, isHovered) {
    const elements = getHighlightElementsById(highlightId);

    for (const element of elements) {
      element.classList.toggle("is-hovered", isHovered);
    }
  }

  globalThis.SimpleHighlightsHighlighter = Object.freeze({
    highlightRange,
    removeHighlightById,
    setHoverState
  });
})();
