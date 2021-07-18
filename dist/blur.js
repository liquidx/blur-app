
const APP_STATE_INIT = 1;
const APP_STATE_IMAGE_LOADED = 2;

const STATE = {
  debug: (window.location.hash.indexOf("#debug") != -1),
  appState: APP_STATE_INIT,
  imageWidth: 0,
  imageHeight: 0,
  blurRadius: 100,
  minBlurWidth: 500,
  minBlurHeight: 300,
  touchStartPoint: null,
};
 
const setState = (newState) => {
  const button = document.querySelector("button#action");

  switch (newState) {
    case APP_STATE_INIT: {
      button.innerText = "Load";
      clearCanvas();
      clearOverlay();
      clearImageLoader();
      break;
    }
    case APP_STATE_IMAGE_LOADED: {
      button.innerText = "Save"
      break;
    }
    default:
      break;
  }

  STATE.appState = newState;
};

const getCanvas = () => {
  return document.querySelector("canvas#canvas");
}

const getOverlay = () => {
  return document.querySelector("canvas#overlay");
}

//
// Rendering results.
//

const saveImage = () => {
  const canvas = document.getElementById("canvas");
  var link = document.createElement("a");
  link.download = "blurred.jpg";
  link.href = canvas.toDataURL("image/jpeg");
  link.click();
  link.delete;
};

/** Translate from screen coordinates (from an event) to canvas coordinates. */
const mousePointOnCanvas = (canvas, e) => {
  const canvasRect = canvas.getBoundingClientRect();

  // Work out which direction we've been scaled.
  let captureRatio = STATE.imageWidth / STATE.imageHeight;
  let canvasRatio = canvasRect.width / canvasRect.height;

  let canvasOriginX = canvasRect.left;
  let canvasOriginY = canvasRect.top;
  let canvasVisibleHeight = canvasRect.height;
  let canvasVisibleWidth = canvasRect.width;

  if (canvasRatio < captureRatio) {
    // Vertically center aligned, shrunken horizontally
    canvasVisibleHeight = canvasRect.width / captureRatio;
    canvasOriginY =
      canvasRect.top + (canvasRect.height - canvasVisibleHeight) / 2;
  } else {
    // Horizontally centered, shrunken vertically.
    canvasVisibleWidth = canvasRect.height * captureRatio;
    canvasOriginX =
      canvasRect.left + (canvasRect.width - canvasVisibleWidth) / 2;
  }

  // Coordinates of the mouse releative to the original canvas size.
  const canvasMouseX =
    ((e.clientX - canvasOriginX) / canvasVisibleWidth) * canvas.width;
  const canvasMouseY =
    ((e.clientY - canvasOriginY) / canvasVisibleHeight) * canvas.height;
  const imageX =
    ((e.clientX - canvasOriginX) / canvasVisibleWidth) * STATE.imageWidth;
  const imageY =
    ((e.clientY - canvasOriginY) / canvasVisibleHeight) * STATE.imageHeight;

  return { x: canvasMouseX, y: canvasMouseY, imageX, imageY };
};

const clearCanvas  = () => {
  const canvas = getCanvas();
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

const clearOverlay = () => {
  const overlay = getOverlay();
  const context = overlay.getContext('2d');
  context.clearRect(0, 0, overlay.width, overlay.height);
}

const clearImageLoader = () => {
  document.querySelector("#offscreen-buffer").src = "";
  document.querySelector('#file-selector').value = null;
}

const drawOverlay = (start, end) => {
  const topLeft = {
    x: Math.round((start.x < end.x) ? start.x : end.x), 
    y: Math.round((start.y < end.y) ? start.y : end.y) 
  };

  const dragDistanceX = Math.ceil(Math.abs(end.x - start.x));
  const dragDistanceY = Math.ceil(Math.abs(end.y - start.y));


  const overlay = getOverlay();
  const context = overlay.getContext('2d');
  context.clearRect(0, 0, overlay.width, overlay.height);
  context.strokeStyle = 'white';
  context.lineWidth = 10;
  context.strokeRect(topLeft.x, topLeft.y, dragDistanceX, dragDistanceY);
}

const blur = (touchStartPoint, touchEndPoint) => {
  const start = touchStartPoint;
  const end = touchEndPoint;
  const dragDistanceX = Math.ceil(Math.abs(end.x - start.x));
  const dragDistanceY = Math.ceil(Math.abs(end.y - start.y));
  const blurWidth = Math.ceil(Math.max(dragDistanceX, STATE.minBlurWidth));
  const blurHeight = Math.ceil(Math.max(dragDistanceY, STATE.minBlurHeight));

  const topLeft = {
    x: Math.round((start.x < end.x) ? start.x : end.x), 
    y: Math.round((start.y < end.y) ? start.y : end.y) 
  };

  console.log(`Blur at ${topLeft.x}, ${topLeft.y}, ${blurWidth}, ${blurHeight} radius: ${STATE.blurRadius}`)

  const canvas = document.querySelector("canvas");
  StackBlur.canvasRGBA(canvas, topLeft.x, topLeft.y, blurWidth, blurHeight, STATE.blurRadius);
}

const canvasTouchDidStart = (e) => {
  if (STATE.appState != APP_STATE_IMAGE_LOADED) {
    return;
  }
  e.preventDefault();
  const touches = e.changedTouches;
  const canvas = document.querySelector("canvas");
  const point = mousePointOnCanvas(canvas, touches[0]);
  STATE.touchStartPoint = point;
}

const canvasTouchDidMove = (e) => {
  if (STATE.appState != APP_STATE_IMAGE_LOADED) {
    return;
  }
  e.preventDefault();
  const touches = e.changedTouches;
  const point = mousePointOnCanvas(getCanvas(), touches[0]);
  drawOverlay(STATE.touchStartPoint, point);
}

const canvasTouchDidEnd = (e) => {
  if (STATE.appState != APP_STATE_IMAGE_LOADED) {
    return;
  }
  e.preventDefault();
  const touches = e.changedTouches;
  const canvas = document.querySelector("canvas");
  const end = mousePointOnCanvas(canvas, touches[0]);
  blur(STATE.touchStartPoint, end);
  clearOverlay();
}

const loadImage = (reload) => {
  const canvas = getCanvas();
  const overlay = getOverlay();
  const context = canvas.getContext("2d");
  const offscreenImage = document.querySelector("#offscreen-buffer");

  STATE.imageWidth = offscreenImage.width;
  STATE.imageHeight = offscreenImage.height;
  if (!reload) {
    updateBlurRadiusSettings()
  }

  canvas.width = offscreenImage.width;
  canvas.height = offscreenImage.height;
  overlay.width = canvas.width;
  overlay.height = canvas.height;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(offscreenImage, 0, 0, canvas.width, canvas.height);
};

const updateBlurRadiusSettings = () => {
  const blurRadiusControl = document.querySelector('#blur-radius');
  if (STATE.imageWidth > 0) {
    STATE.blurRadius = Math.ceil(Math.min(STATE.imageWidth, STATE.imageHeight) / 30);
    blurRadiusControl.value = STATE.blurRadius;
    // The maximum blur radius cannot be too large.
    blurRadiusControl.max = Math.ceil(Math.min(STATE.imageWidth, STATE.imageHeight) / 20);
  } else {
    STATE.blurRadius = 100;
  }
  document.querySelector('#blur-radius-value').innerText = `${STATE.blurRadius}`
}


//
// Capture Button Handler
//

const actionButtonDidClick = () => {
  console.log(STATE.appState)
  switch (STATE.appState) {
    case APP_STATE_INIT: {
      document.querySelector('#file-selector').click();
      break;
    }
    case APP_STATE_IMAGE_LOADED: {
      saveImage();
      setState(APP_STATE_INIT);
      break;
    }
    default:
      break;
  }
};

const undoButtonDidClick = () => {
  if (STATE.appState == APP_STATE_IMAGE_LOADED) {
    // Reset state.
    // TODO: Make it a real instead of resetting everything.
    loadImage(true);
  }
}

const filesDidChange = (e) => {
  const files = e.target.files;
  if (!files.length) {
    return;
  }

  // Assume there is only one file.
  const file = files[0];
  const offscreen = document.querySelector("#offscreen-buffer");
  offscreen.file = file;  // just for reference.

  // Read the file
  const reader = new FileReader();
  reader.onload = loadEvent => {
    offscreen.src = loadEvent.target.result;
  };
  reader.readAsDataURL(file);
}

const offscreenBufferDidUpdate = () => {
  loadImage();
  setState(APP_STATE_IMAGE_LOADED);
}

const blurRadiusDidChange = (e) => {
  STATE.blurRadius = Math.ceil(parseInt(e.target.value, 10));
  console.log(`Blur: ${STATE.blurRadius}`)
  document.querySelector('#blur-radius-value').innerText = `${STATE.blurRadius}`
}

//
// Start up.
//

const start = () => {
  console.log('start');
  const button = document.querySelector("#action");
  const canvas = document.querySelector("canvas#canvas");
  const fileSelector = document.querySelector('#file-selector');
  const offscreen = document.querySelector("#offscreen-buffer");
  const blurRadiusControl = document.querySelector('#blur-radius');
  const undoButton = document.querySelector("#undo");


  button.addEventListener("click", actionButtonDidClick);
  fileSelector.addEventListener("change", filesDidChange)
  blurRadiusControl.addEventListener("change", blurRadiusDidChange);
  offscreen.addEventListener("load", offscreenBufferDidUpdate)
  undoButton.addEventListener("click", undoButtonDidClick);

  canvas.addEventListener("touchstart", canvasTouchDidStart);
  canvas.addEventListener("touchmove", canvasTouchDidMove);
  canvas.addEventListener("touchend", canvasTouchDidEnd)

  // Prevent context menu from showing.
  window.oncontextmenu = function() { return false; }

  // Initialize
  updateBlurRadiusSettings();
};

document.addEventListener("DOMContentLoaded", start);
