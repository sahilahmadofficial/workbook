/**
 * Button renderer process
 * Handles drag behavior and click events
 */

const button = document.getElementById('button');
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Handle button click to toggle panel
button.addEventListener('click', (e) => {
  console.log('Button clicked, isDragging:', isDragging);
  // Only trigger if not dragging
  if (!isDragging) {
    console.log('Sending toggle-panel message');
    window.electronAPI.togglePanel();
  }
});

// Custom window dragging implementation
button.addEventListener('mousedown', (e) => {
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  isDragging = false;
  console.log('Mouse down on button');
  
  const onMouseMove = (moveEvent) => {
    const deltaX = moveEvent.screenX - dragStartX;
    const deltaY = moveEvent.screenY - dragStartY;
    
    // Consider it a drag if moved more than 3 pixels
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      if (!isDragging) {
        isDragging = true;
        console.log('Dragging started');
        window.electronAPI.onButtonDragStart();
      }
      
      // Move the window
      window.electronAPI.moveWindow(moveEvent.screenX, moveEvent.screenY);
    }
  };
  
  const onMouseUp = (upEvent) => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    if (isDragging) {
      console.log('Drag ended');
      window.electronAPI.onButtonDragEnd({
        x: upEvent.screenX,
        y: upEvent.screenY
      });
      
      // Reset drag flag after a short delay to prevent click event
      setTimeout(() => {
        isDragging = false;
      }, 100);
    } else {
      // It was a click, not a drag - reset immediately
      isDragging = false;
    }
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

// Listen for edge changes to update arrow direction
window.electronAPI.onEdgeChanged((edge) => {
  console.log('Edge changed to:', edge);
  // Remove all edge classes
  button.classList.remove('edge-top', 'edge-right', 'edge-bottom', 'edge-left');
  
  // Add the current edge class
  button.classList.add(`edge-${edge}`);
});

// Request initial edge position
console.log('Button renderer loaded, requesting edge');
window.electronAPI.getEdge();
