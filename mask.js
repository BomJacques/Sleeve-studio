"use strict";

// Seed points and brush paths are saved in source-image coordinates. The same
// mask follows the photo through rotation, zoom and every export format.
const maskSamples = new WeakMap();
let composedMask = null;
let maskSession = null;

function maskCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function sampleImage(image) {
  if (maskSamples.has(image)) return maskSamples.get(image);
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = maskCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const sample = {canvas, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data};
  maskSamples.set(image, sample);
  return sample;
}

function selectRegion(ctx, sample, action) {
  const {width, height} = ctx.canvas;
  const pixelCount = width * height;
  const start = Math.min(height - 1, Math.floor(action.y * height)) * width
    + Math.min(width - 1, Math.floor(action.x * width));
  const pixels = sample.pixels;
  const seed = pixels.subarray(start * 4, start * 4 + 4);
  const limit = 3 * action.tolerance ** 2;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const result = ctx.getImageData(0, 0, width, height);
  let read = 0, write = 0;
  const value = action.keep ? 255 : 0;
  function visit(p) {
    if (visited[p]) return;
    visited[p] = 1;
    const j = p * 4;
    const distance = (pixels[j] - seed[0]) ** 2 + (pixels[j+1] - seed[1]) ** 2
      + (pixels[j+2] - seed[2]) ** 2;
    if (distance <= limit && Math.abs(pixels[j+3] - seed[3]) <= action.tolerance) queue[write++] = p;
  }
  visit(start);
  while (read < write) {
    const p = queue[read++];
    const j = p * 4;
    result.data[j] = result.data[j+1] = result.data[j+2] = value;
    if (p % width > 0) visit(p - 1);
    if (p % width < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p + width < pixelCount) visit(p + width);
  }
  ctx.putImageData(result, 0, 0);
}

function paintMaskAction(ctx, sample, action) {
  if (action.type === 'region') return selectRegion(ctx, sample, action);
  const {width, height} = ctx.canvas;
  const points = action.points;
  const radius = Math.min(width, height) * action.diameter / 2;
  ctx.fillStyle = ctx.strokeStyle = action.keep ? 'white' : 'black';
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.lineWidth = 2 * radius;
  const [x, y] = points[0];
  ctx.beginPath();
  ctx.arc(x * width, y * height, radius, 0, 2 * Math.PI);
  ctx.fill();
  if (points.length === 1) return;
  ctx.beginPath();
  ctx.moveTo(x * width, y * height);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * width, points[i][1] * height);
  ctx.stroke();
}

function rawSelection(sample, actions) {
  const canvas = maskCanvas(sample.canvas.width, sample.canvas.height);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.fillStyle = actions[0]?.keep ? 'black' : 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const action of actions) paintMaskAction(ctx, sample, action);
  return canvas;
}

// Summed-area filtering keeps edge shifts and feathering linear in pixel count.
function filterEdge(alpha, w, h, radius, mode) {
  if (!radius) return alpha;
  const stride = w + 1;
  const sums = new Uint32Array(stride * (h + 1));
  const out = new Uint8ClampedArray(alpha.length);
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += alpha[y*w+x];
      sums[(y+1)*stride+x+1] = sums[y*stride+x+1] + row;
    }
  }
  for (let y = 0; y < h; y++) {
    const top = Math.max(0, y-radius), bottom = Math.min(h, y+radius+1);
    for (let x = 0; x < w; x++) {
      const left = Math.max(0, x-radius), right = Math.min(w, x+radius+1);
      const area = (bottom-top) * (right-left);
      const sum = sums[bottom*stride+right] - sums[top*stride+right]
        - sums[bottom*stride+left] + sums[top*stride+left];
      let value = sum / area;
      if (mode === 'expand') value = sum > 0 ? 255 : 0;
      if (mode === 'contract') value = sum === 255 * area ? 255 : 0;
      out[y*w+x] = value;
    }
  }
  return out;
}

function refinedSelection(raw, mask) {
  const {width, height} = raw;
  const canvas = maskCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const data = raw.getContext('2d').getImageData(0, 0, width, height);
  const count = width * height;
  let alpha = new Uint8ClampedArray(count);
  for (let i = 0; i < count; i++) alpha[i] = data.data[i * 4];
  alpha = filterEdge(alpha, width, height, Math.abs(mask.edge), mask.edge > 0 ? 'expand' : 'contract');
  alpha = filterEdge(alpha, width, height, mask.smooth, 'feather');
  for (let i = 0; i < count; i++) data.data[i * 4 + 3] = mask.invert ? 255 - alpha[i] : alpha[i];
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function maskedPhoto(image, correctedImage, mask) {
  if (!mask) return correctedImage;
  if (composedMask?.settings === mask && composedMask.source === correctedImage) return composedMask.canvas;
  const matte = refinedSelection(rawSelection(sampleImage(image), mask.actions), mask);
  const canvas = maskCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(correctedImage, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(matte, 0, 0, canvas.width, canvas.height);
  composedMask = {settings: mask, source: correctedImage, canvas};
  return canvas;
}

function renderMaskEditor() {
  const session = maskSession;
  if (!session) return;
  const {draft, sample, raw} = session;
  const view = $('maskpreview');
  const ctx = view.getContext('2d');
  const matte = refinedSelection(raw, draft);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.drawImage(sample.canvas, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(matte, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  if ($('maskghost').checked) {
    ctx.globalAlpha = .23;
    ctx.drawImage(sample.canvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#17191b';
  } else ctx.fillStyle = state.fillColor || '#151513';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.globalCompositeOperation = 'source-over';
  $('maskundo').disabled = !draft.actions.length;
  $('maskapply').disabled = !draft.actions.length;
}

function openMaskEditor(image) {
  const sample = sampleImage(image);
  const draft = structuredClone(state.photoStyle.mask || {actions: [], edge: 0, smooth: 1, invert: false});
  maskSession = {draft, sample, raw: rawSelection(sample, draft.actions), stroke: null, frame: 0};
  const view = $('maskpreview');
  view.width = sample.canvas.width;
  view.height = sample.canvas.height;
  view.style.aspectRatio = view.width + ' / ' + view.height;
  $('maskedge').value = draft.edge;
  $('masksmooth').value = draft.smooth;
  $('maskinvert').checked = draft.invert;
  $('maskmode').value = 'select';
  $('maskghost').checked = true;
  $('maskmode').onchange();
  $('maskdialog').showModal();
  renderMaskEditor();
}

function setupMaskEditor() {
  const view = $('maskpreview');
  const dialog = $('maskdialog');
  const isBrush = () => ['restore','erase'].includes($('maskmode').value);
  const point = event => {
    const box = view.getBoundingClientRect();
    return [clamp((event.clientX-box.left)/box.width, 0, 1), clamp((event.clientY-box.top)/box.height, 0, 1)];
  };
  function schedulePreview() {
    if (maskSession.frame) return;
    maskSession.frame = requestAnimationFrame(() => {
      maskSession.frame = 0;
      renderMaskEditor();
    });
  }
  $('maskmode').onchange = () => {
    $('tolerancefield').hidden = isBrush();
    $('brushfield').hidden = !isBrush();
    $('maskhint').textContent = isBrush() ? 'Paint over the image to refine the selection.' : 'Click a connected area of similar colour. Click again to include another part.';
    if ($('maskmode').value === 'subtract') $('maskhint').textContent = 'Click a connected area of similar colour to hide it.';
  };
  view.onpointerdown = event => {
    const session = maskSession;
    if (!session || session.stroke || event.button !== 0) return;
    const [x, y] = point(event);
    const mode = $('maskmode').value;
    const keep = mode === 'select' || mode === 'restore';
    const action = isBrush() ? {type:'brush', keep, points:[[x,y]], diameter:Number($('maskbrush').value)}
      : {type:'region', keep, x, y, tolerance:Number($('masktolerance').value)};
    const {draft, sample, raw} = session;
    const ctx = raw.getContext('2d');
    if (!draft.actions.length) {
      ctx.fillStyle = keep ? 'black' : 'white';
      ctx.fillRect(0,0,raw.width,raw.height);
    }
    draft.actions.push(action);
    paintMaskAction(ctx, sample, action);
    if (isBrush()) {
      session.stroke = {action, id:event.pointerId};
      view.setPointerCapture(event.pointerId);
    }
    schedulePreview();
  };
  view.onpointermove = event => {
    const session = maskSession;
    if (session?.stroke?.id !== event.pointerId) return;
    const action = session.stroke.action;
    const next = point(event);
    const last = action.points[action.points.length - 1];
    action.points.push(next);
    paintMaskAction(session.raw.getContext('2d'), session.sample, {...action, points:[last, next]});
    schedulePreview();
  };
  view.onlostpointercapture = () => {if (maskSession) maskSession.stroke = null};
  $('maskundo').onclick = () => {
    const session = maskSession;
    session.draft.actions.pop();
    session.raw = rawSelection(session.sample, session.draft.actions);
    renderMaskEditor();
  };
  for (const id of ['maskedge','masksmooth','maskinvert','maskghost']) {
    $(id).onchange = () => {
      Object.assign(maskSession.draft, {edge:Number($('maskedge').value), smooth:Number($('masksmooth').value), invert:$('maskinvert').checked});
      renderMaskEditor();
    };
  }
  $('maskapply').onclick = () => {
    const mask = maskSession.draft;
    dialog.close();
    change(() => { state.photoStyle.mask = mask });
  };
  dialog.addEventListener('close', () => {
    if (maskSession) cancelAnimationFrame(maskSession.frame);
    maskSession = null;
  });
}
