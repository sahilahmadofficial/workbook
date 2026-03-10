/**
 * Button renderer process
 * Handles drag behavior, click events, and visual state
 */

const button = document.getElementById('button');
let isDragging = false;
let dragJustEnded = false; // Guards against click firing right after drag ends
let dragStartX = 0;
let rafPending = false;    // Throttles moveWindow IPC to one call per animation frame
let panelOpen = false;

// Click — toggle panel, but never if a drag just finished
button.addEventListener('click', () => {
  if (dragJustEnded) return;
  panelOpen = !panelOpen;
  button.classList.toggle('panel-open', panelOpen);
  window.electronAPI.togglePanel();
});

button.addEventListener('mousedown', (e) => {
  dragStartX = e.screenX;
  // Y is intentionally not tracked — button movement is horizontal-only
  isDragging = false;
  dragJustEnded = false;

  const onMouseMove = (moveEvent) => {
    const deltaX = moveEvent.screenX - dragStartX;

    // Only horizontal delta starts a drag — vertical movement does nothing
    if (Math.abs(deltaX) > 3) {
      if (!isDragging) {
        isDragging = true;
        window.electronAPI.onButtonDragStart();
      }

      // Throttle IPC to one call per animation frame to avoid flooding main process
      if (!rafPending) {
        rafPending = true;
        const sx = moveEvent.screenX;
        const sy = moveEvent.screenY;
        requestAnimationFrame(() => {
          window.electronAPI.moveWindow(sx, sy);
          rafPending = false;
        });
      }
    }
  };

  const onMouseUp = (upEvent) => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    rafPending = false;

    if (isDragging) {
      isDragging = false;
      dragJustEnded = true;
      window.electronAPI.onButtonDragEnd({ x: upEvent.screenX, y: upEvent.screenY });
      // Clear guard after the click event has had a chance to fire and be blocked
      setTimeout(() => { dragJustEnded = false; }, 0);
    }
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

// Reset panel-open state when button regains focus after being reshown
// (happens when the panel is closed via the in-app close button)
window.addEventListener('focus', () => {
  panelOpen = false;
  button.classList.remove('panel-open');
});

// Guard against duplicate listeners if the script is ever re-executed
if (!window._edgeListenerAttached) {
  window._edgeListenerAttached = true;
  window.electronAPI.onEdgeChanged((edge) => {
    button.classList.remove('edge-top', 'edge-right', 'edge-bottom', 'edge-left');
    button.classList.add(`edge-${edge}`);
  });
}

window.electronAPI.getEdge();