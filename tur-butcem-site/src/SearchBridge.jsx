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

const clickQueuedHeaderAction = () => {
  let action = "";
  try { action = sessionStorage.getItem("muhasebe:open-header-tool") || ""; } catch {}
  if (!action) return false;

  const buttons = [...document.querySelectorAll(".v7-header button")];
  const target = buttons.find((button) =>
    button.getAttribute("title") === action ||
    button.textContent?.replace(/\s+/g, " ").trim().includes(action),
  );
  if (!target) return false;

  try { sessionStorage.removeItem("muhasebe:open-header-tool"); } catch {}
  target.click();
  return true;
};

export default function SearchBridge() {
  useEffect(() => {
    let boundInput = null;
    let frame = 0;

    const activateGlobalSearch = (event) => {
      const value = String(event.currentTarget?.value || "").trim();
      if (!value) return;

      // Arama tüm muhasebe defterini kapsasın; eski tarih/tür/durum filtresi
      // kullanıcıya yanlış biçimde "sonuç yok" göstermesin.
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
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const input = document.querySelector(".v7-filterbar .searchbox input");
        if (input !== boundInput) {
          boundInput?.removeEventListener("input", activateGlobalSearch);
          boundInput = input;
          if (boundInput) {
            boundInput.disabled = false;
            boundInput.readOnly = false;
            boundInput.setAttribute("autocomplete", "off");
            boundInput.setAttribute("aria-label", "Muhasebe kayıtlarında ara");
            boundInput.addEventListener("input", activateGlobalSearch);
          }
        }
        clickQueuedHeaderAction();
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", sync);
    window.addEventListener("muhasebe:site-nav", sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("popstate", sync);
      window.removeEventListener("muhasebe:site-nav", sync);
      boundInput?.removeEventListener("input", activateGlobalSearch);
    };
  }, []);

  return null;
}
