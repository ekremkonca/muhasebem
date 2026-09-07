import { useEffect } from "react";

const setNativeValue = (element, value) => {
  if (!element) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    "value",
  );
  descriptor?.set?.call(element, value);
  if (!descriptor?.set) element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

export default function SearchBridge() {
  useEffect(() => {
    let boundInput = null;

    const activateGlobalSearch = (event) => {
      const value = String(event.currentTarget?.value || "").trim();
      if (!value) return;

      // Search should cover the complete accounting ledger, not only the
      // currently selected date/type/status slice.
      const allDateButton = [...document.querySelectorAll(".date-presets button")]
        .find((button) => button.textContent?.trim() === "Tümü");
      if (allDateButton && !allDateButton.classList.contains("active")) {
        allDateButton.click();
      }

      const filters = document.querySelectorAll(".records-tools select");
      if (filters[0] && filters[0].value !== "Tümü") setNativeValue(filters[0], "Tümü");
      if (filters[1] && filters[1].value !== "Tümü") setNativeValue(filters[1], "Tümü");
    };

    const sync = () => {
      const input = document.querySelector(".v7-filterbar .searchbox input");
      if (input === boundInput) return;
      boundInput?.removeEventListener("input", activateGlobalSearch);
      boundInput = input;
      if (!boundInput) return;
      boundInput.disabled = false;
      boundInput.readOnly = false;
      boundInput.setAttribute("autocomplete", "off");
      boundInput.setAttribute("aria-label", "Muhasebe kayıtlarında ara");
      boundInput.addEventListener("input", activateGlobalSearch);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      boundInput?.removeEventListener("input", activateGlobalSearch);
    };
  }, []);

  return null;
}
