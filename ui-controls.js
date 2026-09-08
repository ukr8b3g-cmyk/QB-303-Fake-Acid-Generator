/* Small display-only controls layered on top of the audio app. */
(() => {
  'use strict';
  const machine = document.querySelector('.machine');
  const lockButton = document.querySelector('#color-lock');
  const colorPopButton = document.querySelector('#color-pop');
  if (!machine || !lockButton) return;

  const STORAGE = 'qb303.color-lock.v1';
  let locked = false;
  let lockedColor = machine.dataset.color || 'classic';
  let restoring = false;

  try { locked = localStorage.getItem(STORAGE) === '1'; } catch (_) { /* Optional. */ }

  function currentColor() { return machine.dataset.color || 'classic'; }
  function restoreLockedColor() {
    if (!locked || restoring || currentColor() === lockedColor) return;
    restoring = true;
    machine.dataset.color = lockedColor;
    restoring = false;
  }
  function sync() {
    lockButton.setAttribute('aria-pressed', String(locked));
    lockButton.setAttribute('aria-label', locked ? `COLOR LOCK オン、配色 ${lockedColor} を固定中` : 'COLOR LOCK オフ、配色変更を許可');
    document.body.classList.toggle('color-locked', locked);
    if (colorPopButton) colorPopButton.setAttribute('aria-disabled', String(locked));
  }

  lockButton.addEventListener('click', () => {
    locked = !locked;
    if (locked) lockedColor = currentColor();
    try { localStorage.setItem(STORAGE, locked ? '1' : '0'); } catch (_) { /* Optional. */ }
    sync();
  });

  // Manual COLOR POP is blocked while locked. Automatic RUSH changes are
  // caught by the observer before the browser paints the new palette.
  colorPopButton?.addEventListener('click', event => {
    if (!locked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  new MutationObserver(() => restoreLockedColor()).observe(machine, {
    attributes: true,
    attributeFilter: ['data-color']
  });

  if (locked) lockedColor = currentColor();
  sync();
})();
