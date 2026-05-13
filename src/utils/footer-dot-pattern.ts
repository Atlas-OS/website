const LOGO_PATH =
  'M352.562 2.134 411.49 104.2H293.635l12.458-21.579h68.022L352.562 45.29l-9.053 15.68h-24.916l33.969-58.837ZM0 104.211 38.463 1.789h32.053l38.464 102.422H80.505L74.392 86.47H33.544l-6.114 17.74H0Zm39.954-37.719h27.879l-7.305-21.617a440.685 440.685 0 0 0-1.491-4.026 153.553 153.553 0 0 0-1.64-5.217l-1.49-5.666c-.498-1.888-.995-3.528-1.492-4.92h-1.043c-.398 1.889-.994 4.026-1.79 6.411a197.442 197.442 0 0 1-2.236 7.156 175.15 175.15 0 0 1-1.938 6.262l-7.454 21.617Zm94.677 37.719V23.705h-33.245V1.789h93.177v21.916h-33.246v80.506h-26.686Zm74.96 0V1.789h26.686v80.506h52.03v21.916h-78.716ZM457.942 106c-6.46 0-12.523-.596-18.188-1.789-5.665-1.093-10.684-2.932-15.057-5.516-4.274-2.584-7.653-5.964-10.138-10.138-2.485-4.274-3.727-9.492-3.727-15.654v-1.342c0-.497.05-.894.149-1.193h25.792c0 .299-.05.696-.15 1.193v1.044c0 3.18.796 5.764 2.386 7.752 1.689 1.889 4.025 3.28 7.007 4.175 2.981.795 6.46 1.192 10.435 1.192 2.187 0 4.224-.1 6.113-.298 1.888-.199 3.578-.547 5.069-1.043 1.491-.497 2.783-1.094 3.876-1.79 1.193-.795 2.037-1.69 2.534-2.683.597-1.093.895-2.336.895-3.727 0-2.286-.895-4.175-2.684-5.665-1.689-1.491-4.025-2.734-7.007-3.728-2.882-.994-6.162-1.938-9.839-2.832a1854.9 1854.9 0 0 1-11.479-2.833 86.042 86.042 0 0 1-11.48-3.727c-3.677-1.49-7.007-3.38-9.988-5.665-2.883-2.286-5.218-5.119-7.007-8.498-1.69-3.479-2.535-7.653-2.535-12.523 0-5.367 1.143-9.99 3.429-13.865 2.286-3.976 5.417-7.206 9.392-9.69 4.075-2.486 8.747-4.275 14.014-5.368C445.022.596 450.637 0 456.601 0c5.863 0 11.33.596 16.399 1.789 5.168 1.193 9.74 3.081 13.715 5.665 3.976 2.485 7.057 5.666 9.243 9.542 2.286 3.777 3.479 8.349 3.578 13.716V32.5h-25.642v-1.044c0-2.286-.646-4.274-1.938-5.963-1.193-1.79-3.031-3.18-5.516-4.175-2.485-1.093-5.566-1.64-9.243-1.64-3.678 0-6.808.348-9.392 1.044-2.485.696-4.423 1.69-5.815 2.982-1.292 1.292-1.938 2.832-1.938 4.621 0 2.187.845 3.976 2.535 5.367 1.789 1.392 4.174 2.585 7.156 3.579 2.981.993 6.311 1.938 9.988 2.832 3.678.795 7.454 1.69 11.331 2.684a73.35 73.35 0 0 1 11.479 3.578c3.677 1.391 7.007 3.23 9.989 5.516a23.225 23.225 0 0 1 7.006 8.2c1.789 3.28 2.684 7.255 2.684 11.926 0 8.15-1.938 14.71-5.814 19.68-3.777 4.97-9.045 8.597-15.803 10.883-6.659 2.286-14.213 3.429-22.661 3.429Z';

const SVG_VIEWBOX = { width: 503, height: 106 } as const;
const DOT_RADIUS = 1;
const SPACING = 8;
const HOVER_RADIUS = 40;
const TOGGLE_INTERVAL_MS = 100;
const MAX_FPS = 30;

type DotState = {
  x: Float32Array;
  y: Float32Array;
  active: Uint8Array;
  isLogo: Uint8Array;
  hoverIntensity: Float32Array;
  selectable: Uint32Array;
};

function getThemeColor(element: Element, name: string, fallback: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim() || fallback;
}

function buildDotState(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): DotState {
  const { clientWidth, clientHeight } = canvas;
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(clientWidth * devicePixelRatio));
  canvas.height = Math.max(1, Math.round(clientHeight * devicePixelRatio));
  canvas.style.width = `${clientWidth}px`;
  canvas.style.height = `${clientHeight}px`;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  const cols = Math.ceil(clientWidth / SPACING);
  const rows = Math.ceil(clientHeight / SPACING);
  const dotsCount = cols * rows;
  const state: DotState = {
    x: new Float32Array(dotsCount),
    y: new Float32Array(dotsCount),
    active: new Uint8Array(dotsCount),
    isLogo: new Uint8Array(dotsCount),
    hoverIntensity: new Float32Array(dotsCount),
    selectable: new Uint32Array(0),
  };

  const halfSpacing = SPACING / 2;
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      state.x[index] = col * SPACING + halfSpacing;
      state.y[index] = row * SPACING + halfSpacing;
      index += 1;
    }
  }

  markLogoDots(state, clientWidth);
  state.selectable = Uint32Array.from(
    Array.from({ length: dotsCount }, (_, dotIndex) => dotIndex).filter(
      dotIndex => !state.isLogo[dotIndex],
    ),
  );

  return state;
}

function markLogoDots(state: DotState, clientWidth: number): void {
  const logoCanvas = document.createElement('canvas');
  const logoCtx = logoCanvas.getContext('2d', { willReadFrequently: true });
  if (!logoCtx) return;

  const scale = 100 / SVG_VIEWBOX.height;
  const logoWidth = Math.ceil(SVG_VIEWBOX.width * scale);
  const logoHeight = Math.ceil(SVG_VIEWBOX.height * scale);
  logoCanvas.width = logoWidth;
  logoCanvas.height = logoHeight;

  logoCtx.fillStyle = 'white';
  logoCtx.scale(scale, scale);
  logoCtx.fill(new Path2D(LOGO_PATH));

  const imageData = logoCtx.getImageData(0, 0, logoWidth, logoHeight);
  const startX = clientWidth - logoWidth - 100;
  const startY = 75;

  for (let index = 0; index < state.x.length; index += 1) {
    const relativeX = Math.round(state.x[index]! - startX);
    const relativeY = Math.round(state.y[index]! - startY);
    if (relativeX < 0 || relativeX >= logoWidth || relativeY < 0 || relativeY >= logoHeight)
      continue;

    const pixelIndex = (relativeY * logoWidth + relativeX) * 4;
    if ((imageData.data[pixelIndex + 3] ?? 0) <= 128) continue;

    state.isLogo[index] = 1;
    state.active[index] = 1;
  }
}

export function initFooterDotPattern(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#footer-dot-pattern');
  if (!canvas || canvas.dataset.footerDotsInitialized === 'true') return;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const footerCanvas = canvas;
  const footerContext = context;

  footerCanvas.dataset.footerDotsInitialized = 'true';
  const section = footerCanvas.closest('section');
  const controller = new AbortController();
  const { signal } = controller;

  let state = buildDotState(footerCanvas, footerContext);
  let animationId = 0;
  let lastToggleTime = performance.now();
  let lastDrawTime = performance.now();
  let mouseX = -1;
  let mouseY = -1;
  let isMouseOver = false;

  const activeColor = () => getThemeColor(footerCanvas, '--color-primary', '#3b82f6');
  const inactiveColor = () =>
    getThemeColor(footerCanvas, '--footer-dot-color', 'rgba(68, 68, 68, 0.3)');

  function resize(): void {
    state = buildDotState(footerCanvas, footerContext);
    draw();
  }

  function updateHover(): void {
    if (isMouseOver) {
      const radiusSq = HOVER_RADIUS * HOVER_RADIUS;
      for (let index = 0; index < state.x.length; index += 1) {
        const dx = state.x[index]! - mouseX;
        const dy = state.y[index]! - mouseY;
        const distSq = dx * dx + dy * dy;
        if (distSq >= radiusSq) continue;
        state.hoverIntensity[index] = Math.max(
          state.hoverIntensity[index]!,
          (1 - distSq / radiusSq) * 0.5,
        );
      }
    }

    for (let index = 0; index < state.hoverIntensity.length; index += 1) {
      state.hoverIntensity[index] = (state.hoverIntensity[index] ?? 0) * 0.85;
      if (state.hoverIntensity[index]! < 0.01) state.hoverIntensity[index] = 0;
    }
  }

  function drawDot(index: number, color: string, size = DOT_RADIUS): void {
    footerContext.beginPath();
    footerContext.arc(state.x[index]!, state.y[index]!, size, 0, Math.PI * 2);
    footerContext.fillStyle = color;
    footerContext.fill();
  }

  function draw(): void {
    footerContext.clearRect(0, 0, footerCanvas.clientWidth, footerCanvas.clientHeight);
    const active = activeColor();
    const inactive = inactiveColor();

    for (let index = 0; index < state.x.length; index += 1) {
      if (state.isLogo[index]) continue;
      const hover = state.hoverIntensity[index]!;
      if (hover > 0.05) {
        const color = state.active[index]
          ? active
          : `rgb(59 130 246 / ${Math.min(hover * 1.5, 0.8)})`;
        drawDot(index, color, DOT_RADIUS * (1 + hover * 1.2));
      } else {
        drawDot(index, state.active[index] ? active : inactive);
      }
    }

    for (let index = 0; index < state.x.length; index += 1) {
      if (state.isLogo[index]) drawDot(index, active, DOT_RADIUS * 1.2);
    }
  }

  function toggleRandomDot(): void {
    if (state.selectable.length === 0) return;
    const selected = state.selectable[Math.floor(Math.random() * state.selectable.length)];
    if (selected === undefined) return;
    state.active[selected] = state.active[selected] ? 0 : 1;
  }

  function animate(): void {
    const now = performance.now();
    if (now - lastDrawTime >= 1000 / MAX_FPS) {
      if (now - lastToggleTime >= TOGGLE_INTERVAL_MS) {
        lastToggleTime = now;
        toggleRandomDot();
      }
      updateHover();
      draw();
      lastDrawTime = now;
    }
    animationId = window.requestAnimationFrame(animate);
  }

  function updateMousePosition(event: MouseEvent): void {
    const rect = footerCanvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    isMouseOver = true;
  }

  function resetMousePosition(): void {
    mouseX = -1;
    mouseY = -1;
    isMouseOver = false;
  }

  window.addEventListener('resize', resize, { signal });
  footerCanvas.addEventListener('mousemove', updateMousePosition, { signal });
  footerCanvas.addEventListener('mouseleave', resetMousePosition, { signal });
  section?.addEventListener('mousemove', updateMousePosition, { signal });
  section?.addEventListener('mouseleave', resetMousePosition, { signal });

  draw();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animate();
  }

  document.addEventListener(
    'astro:before-swap',
    () => {
      window.cancelAnimationFrame(animationId);
      controller.abort();
      delete footerCanvas.dataset.footerDotsInitialized;
    },
    { once: true },
  );
}
