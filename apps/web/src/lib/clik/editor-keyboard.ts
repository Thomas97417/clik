/** Leave native keyboard controls, text editing and overlays in charge of their keys. */
export function editorShortcutTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target === document.body || !!target.closest(".editor")) &&
    !target.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="separator"],[role="menu"],[role="listbox"],[role="combobox"],[role="slider"],[role="spinbutton"],[role="tablist"],[role="radiogroup"]',
    ) &&
    !document.querySelector(
      'dialog[open],[role="dialog"],[role="alertdialog"],[role="menu"],.driver-overlay',
    )
  );
}
