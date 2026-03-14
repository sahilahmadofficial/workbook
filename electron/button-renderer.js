/**
 * Button renderer process
 * Handles drag behavior, click events, and visual state
 */

const button = document.getElementById('button');
let isDragging = false;
let dragJustEnded = false;
let dragStartX = 0;
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
  isDragging = false;
  dragJustEnded = false;

  const onMouseMove = (moveEvent) => {
    const deltaX = moveEvent.screenX - dragStartX;

    if (Math.abs(deltaX) > 3) {
      if (!isDragging) {
        isDragging = true;
        // Pass the cursor's screenX at drag start so main can anchor correctly
        window.electronAPI.onButtonDragStart(dragStartX);
      }

      // Send every mousemove directly — no RAF throttle.
      // RAF captures a stale screenX that no longer matches where the cursor
      // actually is when the frame fires, causing the snap-back glitch.
      window.electronAPI.moveWindow(moveEvent.screenX);
    }
  };

  const onMouseUp = (upEvent) => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (isDragging) {
      isDragging = false;
      dragJustEnded = true;
      window.electronAPI.onButtonDragEnd({ x: upEvent.screenX, y: upEvent.screenY });
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