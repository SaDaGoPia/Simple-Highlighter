"use strict";

(() => {
  const STORAGE_KEY = "selectedHighlightColor";
  const DEFAULT_COLOR = "#fae082";

  const COLOR_PALETTE = Object.freeze([
    Object.freeze({ id: "sun", label: "Sun", value: "#fae082" }),
    Object.freeze({ id: "mint", label: "Mint", value: "#b7efc5" }),
    Object.freeze({ id: "sky", label: "Sky", value: "#b9d9ff" }),
    Object.freeze({ id: "rose", label: "Rose", value: "#f9c5d5" })
  ]);

  let selectedColorValue = DEFAULT_COLOR;

  function getColorByValue(colorValue) {
    return COLOR_PALETTE.find((color) => color.value === colorValue) ?? COLOR_PALETTE[0];
  }

  async function initialize() {
    if (!chrome?.storage?.session) {
      return getColorByValue(selectedColorValue);
    }

    try {
      const data = await chrome.storage.session.get(STORAGE_KEY);
      const storedValue = data?.[STORAGE_KEY];

      if (COLOR_PALETTE.some((color) => color.value === storedValue)) {
        selectedColorValue = storedValue;
      }
    } catch (error) {
      console.warn("No se pudo cargar el color de sesion.", error);
    }

    return getColorByValue(selectedColorValue);
  }

  function getSelectedColor() {
    return getColorByValue(selectedColorValue);
  }

  function getColorPalette() {
    return COLOR_PALETTE;
  }

  async function setSelectedColor(colorValue) {
    const color = getColorByValue(colorValue);
    selectedColorValue = color.value;

    if (!chrome?.storage?.session) {
      return color;
    }

    try {
      await chrome.storage.session.set({ [STORAGE_KEY]: selectedColorValue });
    } catch (error) {
      console.warn("No se pudo guardar el color de sesion.", error);
    }

    return color;
  }

  async function cycleSelectedColor() {
    const currentIndex = COLOR_PALETTE.findIndex((color) => color.value === selectedColorValue);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % COLOR_PALETTE.length;
    return setSelectedColor(COLOR_PALETTE[nextIndex].value);
  }

  globalThis.SimpleHighlightsState = Object.freeze({
    initialize,
    getColorPalette,
    getSelectedColor,
    setSelectedColor,
    cycleSelectedColor
  });
})();
