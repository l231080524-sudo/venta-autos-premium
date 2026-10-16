export function scrollPage(direction) {
  const dialog = document.querySelector('dialog[open]');
  const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
  const height = dialog ? dialog.clientHeight : window.innerHeight - headerHeight;
  (dialog || window).scrollBy({ top: direction * Math.max(100, height * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

export function returnToTop() {
  const dialog = document.querySelector('dialog[open]');
  if (dialog) {
    dialog.scrollTo({ top: 0, behavior: 'instant' });
    dialog.querySelector('button')?.focus({ preventScroll: true });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  const firstLink = document.querySelector('.site-nav a');
  (firstLink?.getClientRects().length ? firstLink : document.querySelector('.brand'))?.focus({ preventScroll: true });
}

export function focusNavigation() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  const controls = document.querySelector('.keyboard-controls');
  if (controls) controls.scrollTop = 0;
  (controls?.querySelector('a') || document.getElementById('accessibility-launcher'))?.focus({ preventScroll: true });
}

export function showVehicleDetails() {
  const currentCard = document.activeElement?.closest('.car-card');
  const buttons = [...document.querySelectorAll('#contenido-principal .car-details-button')];
  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
  const target = currentCard?.querySelector('.car-details-button') || buttons.find(button => {
    const bounds = button.closest('.car-card').getBoundingClientRect();
    return bounds.bottom > headerBottom && bounds.top < window.innerHeight;
  }) || buttons[0];
  if (!target) return false;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start', behavior: 'instant' });
  target.click();
  return true;
}
export function isEditing(target) {
  return target instanceof Element && Boolean(target.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"]'));
}

