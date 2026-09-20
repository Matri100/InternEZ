// Injected on demand, only when the user clicks "Fill this page" in the
// popup — this file never runs automatically on pages the user visits.
// fieldMatcher.js is injected immediately before this file (see popup.js)
// and shares this same execution context, so its functions are already
// in scope here without an import.

(function () {
  function isFillableInput(el) {
    if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    if (el.tagName !== "INPUT") return false;
    const type = (el.type || "text").toLowerCase();
    return ["text", "email", "tel", "url", "search"].includes(type);
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function labelFor(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent) return label.textContent;
    }
    const wrappingLabel = el.closest("label");
    if (wrappingLabel && wrappingLabel.textContent) return wrappingLabel.textContent;
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    const describedBy = el.getAttribute("aria-labelledby");
    if (describedBy) {
      const node = document.getElementById(describedBy);
      if (node && node.textContent) return node.textContent;
    }
    return "";
  }

  // Setting .value directly doesn't notify frameworks like React, which
  // track input state through their own synthetic event system — they'd
  // see the DOM change but not "hear" it. Going through the native
  // property setter and dispatching a real input event is the standard
  // workaround: it makes the framework re-read the value as if the user
  // had typed it (or, for a <select>, picked it).
  function setNativeValue(el, value) {
    const proto =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : el.tagName === "SELECT"
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  window.__internezFillForm = function (profile) {
    // Text-like inputs, textareas, and real <select> dropdowns (matched by
    // option text via fieldMatcher's findBestOptionValue). A file input is
    // the one thing that's out of reach regardless — browsers block scripts
    // from setting one at all, by design, for every extension, not just
    // this one.
    const elements = Array.from(document.querySelectorAll("input, textarea, select")).filter(
      (el) => isFillableInput(el) && isVisible(el) && !el.disabled && !el.readOnly
    );

    const descriptors = elements.map((el) => ({
      label: labelFor(el),
      name: el.name || "",
      id: el.id || "",
      placeholder: el.placeholder || "",
      hasValue: Boolean(el.value && el.value.trim()),
      options:
        el.tagName === "SELECT" ? Array.from(el.options).map((o) => ({ value: o.value, text: o.text })) : undefined,
    }));

    const plan = buildFillPlan(descriptors, profile);

    for (const fill of plan) {
      const el = elements[fill.index];
      setNativeValue(el, fill.value);
      el.style.outline = "2px solid #2f6fed";
      el.style.outlineOffset = "1px";
    }

    return {
      filledCount: plan.length,
      totalFields: elements.length,
      filledKeys: plan.map((f) => f.profileKey),
    };
  };
})();
