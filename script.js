/* ============================================
   Text Motion Studio - Main Script
   ============================================ */

// ============================================
// Utility Functions
// ============================================
const Utils = {
    uid: (() => {
        let counter = 0;
        return () => `_${Date.now().toString(36)}_${(counter++).toString(36)}`;
    })(),

    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    lerp: (a, b, t) => a + (b - a) * t,

    formatTime: (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    },

    parseTime: (timeStr) => {
        const parts = timeStr.split(':');
        const mins = parseInt(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return mins * 60 + secs;
    },

    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    },

    rgbToHex: (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(Utils.clamp(x, 0, 255)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    downloadFile: (data, filename, type = 'application/json') => {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    debounce: (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    },

    throttle: (fn, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

    snapToGrid: (value, gridSize) => Math.round(value / gridSize) * gridSize,
};

// ============================================
// Easing Functions
// ============================================
const Easing = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => 1 - (1 - t) * (1 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    bounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    elastic: t => {
        const c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    backIn: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },
    backOut: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    cubicBezier: (p0, p1, p2, p3) => {
        return (t) => {
            const u = 1 - t;
            return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
        };
    },

    get: (name) => {
        if (name.startsWith('cubic-bezier(')) {
            const match = name.match(/cubic-bezier\(([^)]+)\)/);
            if (match) {
                const [x1, y1, x2, y2] = match[1].split(',').map(parseFloat);
                return Easing.cubicBezier(0, y1, y2, 1);
            }
        }
        return Easing[name] || Easing.linear;
    }
};

// ============================================
// Toast Notifications
// ============================================
const Toast = {
    container: null,
    init() {
        this.container = document.getElementById('toast-container');
    },
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// ============================================
// Undo/Redo System
// ============================================
class HistoryManager {
    constructor(maxSize = 50) {
        this.states = [];
        this.index = -1;
        this.maxSize = maxSize;
        this.isUndoing = false;
    }

    push(state) {
        if (this.isUndoing) return;
        // Remove future states if we're not at the end
        if (this.index < this.states.length - 1) {
            this.states = this.states.slice(0, this.index + 1);
        }
        this.states.push(Utils.deepClone(state));
        if (this.states.length > this.maxSize) {
            this.states.shift();
        } else {
            this.index++;
        }
    }

    undo() {
        if (this.index > 0) {
            this.isUndoing = true;
            this.index--;
            const state = Utils.deepClone(this.states[this.index]);
            setTimeout(() => this.isUndoing = false, 0);
            return state;
        }
        return null;
    }

    redo() {
        if (this.index < this.states.length - 1) {
            this.isUndoing = true;
            this.index++;
            const state = Utils.deepClone(this.states[this.index]);
            setTimeout(() => this.isUndoing = false, 0);
            return state;
        }
        return null;
    }

    canUndo() { return this.index > 0; }
    canRedo() { return this.index < this.states.length - 1; }
}

// ============================================
// FPS Monitor
// ============================================
class FPSMonitor {
    constructor() {
        this.frames = [];
        this.lastTime = performance.now();
        this.element = document.getElementById('fps-display');
    }

    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.frames.push(delta);
        if (this.frames.length > 60) this.frames.shift();

        if (this.frames.length >= 10) {
            const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
            const fps = Math.round(1000 / avg);
            if (this.element) {
                this.element.textContent = fps;
                this.element.style.color = fps < 30 ? '#ff4757' : fps < 50 ? '#ffe66d' : '#4ecdc4';
            }
        }
    }
}

// ============================================
// Autosave Manager
// ============================================
class AutosaveManager {
    constructor(key = 'text_motion_studio_autosave') {
        this.key = key;
        this.interval = null;
    }

    start(callback, intervalMs = 30000) {
        this.stop();
        this.interval = setInterval(() => {
            const data = callback();
            if (data) {
                localStorage.setItem(this.key, JSON.stringify(data));
            }
        }, intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    clear() {
        localStorage.removeItem(this.key);
    }
}


// ============================================
// Text Layer Class
// ============================================
class TextLayer {
    constructor(options = {}) {
        this.id = Utils.uid();
        this.name = options.name || 'Text Layer';
        this.type = 'text';
        this.visible = true;
        this.locked = false;

        // Transform
        this.x = options.x ?? 400;
        this.y = options.y ?? 300;
        this.scale = options.scale ?? 1;
        this.rotation = options.rotation ?? 0;
        this.opacity = options.opacity ?? 1;

        // Typography
        this.text = options.text || 'Hello World';
        this.fontFamily = options.fontFamily || 'Inter';
        this.fontSize = options.fontSize ?? 48;
        this.fontWeight = options.fontWeight || '400';
        this.lineHeight = options.lineHeight ?? 1.2;
        this.letterSpacing = options.letterSpacing ?? 0;
        this.textAlign = options.textAlign || 'center';
        this.color = options.color || '#ffffff';

        // Effects
        this.textShadow = options.textShadow || { enabled: false, x: 2, y: 2, blur: 4, color: '#000000' };
        this.glow = options.glow || { enabled: false, color: '#00d4ff', intensity: 10 };
        this.stroke = options.stroke || { enabled: false, width: 2, color: '#000000' };
        this.backgroundBlur = options.backgroundBlur || { enabled: false, amount: 10 };
        this.glassmorphism = options.glassmorphism || { enabled: false };
        this.gradient = options.gradient || { enabled: false, colors: ['#ff006e', '#8338ec'], angle: 45 };
        this.blur = options.blur || 0;
        this.vertical = options.vertical || false;

        // 3D
        this.rotateX = options.rotateX ?? 0;
        this.rotateY = options.rotateY ?? 0;
        this.perspective = options.perspective ?? 1000;

        // Keyframes
        this.keyframes = options.keyframes || {};
        // keyframes structure: { propertyName: [{ time, value, easing }] }

        // Animation effects
        this.effects = options.effects || [];

        // DOM element (created on demand)
        this.element = null;
    }

    clone() {
        const cloned = new TextLayer();
        Object.assign(cloned, Utils.deepClone(this));
        cloned.id = Utils.uid();
        cloned.element = null;
        return cloned;
    }

    getKeyframesAtTime(property, time) {
        const kfs = this.keyframes[property];
        if (!kfs || kfs.length === 0) return null;

        // Sort by time
        const sorted = [...kfs].sort((a, b) => a.time - b.time);

        // Find surrounding keyframes
        let prev = null, next = null;
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].time <= time) prev = sorted[i];
            if (sorted[i].time >= time && !next) next = sorted[i];
        }

        return { prev, next };
    }

    getValueAtTime(property, time) {
        const kfs = this.getKeyframesAtTime(property, time);
        if (!kfs) return this[property];
        if (!kfs.prev && !kfs.next) return this[property];
        if (kfs.prev && !kfs.next) return kfs.prev.value;
        if (!kfs.prev && kfs.next) return kfs.next.value;

        const { prev, next } = kfs;
        const duration = next.time - prev.time;
        if (duration === 0) return prev.value;

        const t = (time - prev.time) / duration;
        const easedT = Easing.get(prev.easing || 'linear')(Utils.clamp(t, 0, 1));

        if (typeof prev.value === 'number') {
            return Utils.lerp(prev.value, next.value, easedT);
        }
        if (typeof prev.value === 'string' && prev.value.startsWith('#')) {
            const c1 = Utils.hexToRgb(prev.value);
            const c2 = Utils.hexToRgb(next.value);
            return Utils.rgbToHex(
                Utils.lerp(c1.r, c2.r, easedT),
                Utils.lerp(c1.g, c2.g, easedT),
                Utils.lerp(c1.b, c2.b, easedT)
            );
        }
        return prev.value;
    }

    addKeyframe(property, time, value, easing = 'linear') {
        if (!this.keyframes[property]) {
            this.keyframes[property] = [];
        }
        // Remove existing keyframe at same time
        this.keyframes[property] = this.keyframes[property].filter(kf => Math.abs(kf.time - time) > 0.01);
        this.keyframes[property].push({ time, value, easing });
        this.keyframes[property].sort((a, b) => a.time - b.time);
    }

    removeKeyframe(property, time) {
        if (!this.keyframes[property]) return;
        this.keyframes[property] = this.keyframes[property].filter(kf => Math.abs(kf.time - time) > 0.01);
        if (this.keyframes[property].length === 0) {
            delete this.keyframes[property];
        }
    }

    updateFromState(state) {
        Object.assign(this, state);
    }
}

// ============================================
// Animation Presets
// ============================================
const AnimationPresets = {
    'fadeIn': {
        name: 'Fade In',
        description: 'Fade in from transparent',
        apply: (layer, startTime = 0, duration = 1) => {
            layer.addKeyframe('opacity', startTime, 0, 'linear');
            layer.addKeyframe('opacity', startTime + duration, 1, 'easeOut');
        }
    },
    'fadeOut': {
        name: 'Fade Out',
        description: 'Fade out to transparent',
        apply: (layer, startTime = 0, duration = 1) => {
            layer.addKeyframe('opacity', startTime, 1, 'linear');
            layer.addKeyframe('opacity', startTime + duration, 0, 'easeIn');
        }
    },
    'pop': {
        name: 'Pop',
        description: 'Scale up with bounce',
        apply: (layer, startTime = 0, duration = 0.6) => {
            layer.addKeyframe('scale', startTime, 0, 'linear');
            layer.addKeyframe('scale', startTime + duration, 1, 'bounce');
        }
    },
    'bounce': {
        name: 'Bounce',
        description: 'Bounce animation',
        apply: (layer, startTime = 0, duration = 1) => {
            layer.addKeyframe('y', startTime, layer.y - 100, 'linear');
            layer.addKeyframe('y', startTime + duration, layer.y, 'bounce');
        }
    },
    'slideLeft': {
        name: 'Slide Left',
        description: 'Slide in from right',
        apply: (layer, startTime = 0, duration = 0.8) => {
            layer.addKeyframe('x', startTime, layer.x + 300, 'linear');
            layer.addKeyframe('x', startTime + duration, layer.x, 'easeOut');
        }
    },
    'slideRight': {
        name: 'Slide Right',
        description: 'Slide in from left',
        apply: (layer, startTime = 0, duration = 0.8) => {
            layer.addKeyframe('x', startTime, layer.x - 300, 'linear');
            layer.addKeyframe('x', startTime + duration, layer.x, 'easeOut');
        }
    },
    'slideUp': {
        name: 'Slide Up',
        description: 'Slide in from bottom',
        apply: (layer, startTime = 0, duration = 0.8) => {
            layer.addKeyframe('y', startTime, layer.y + 200, 'linear');
            layer.addKeyframe('y', startTime + duration, layer.y, 'easeOut');
        }
    },
    'slideDown': {
        name: 'Slide Down',
        description: 'Slide in from top',
        apply: (layer, startTime = 0, duration = 0.8) => {
            layer.addKeyframe('y', startTime, layer.y - 200, 'linear');
            layer.addKeyframe('y', startTime + duration, layer.y, 'easeOut');
        }
    },
    'typewriter': {
        name: 'Typewriter',
        description: 'Typewriter text reveal',
        apply: (layer, startTime = 0, duration = 2) => {
            // Typewriter is handled via effects system
            layer.effects.push({
                type: 'typewriter',
                startTime,
                duration,
                charDuration: duration / Math.max(layer.text.length, 1)
            });
        }
    },
    'glitch': {
        name: 'Glitch',
        description: 'Glitch text effect',
        apply: (layer, startTime = 0, duration = 0.5) => {
            layer.effects.push({
                type: 'glitch',
                startTime,
                duration,
                intensity: 5
            });
        }
    },
    'neonFlicker': {
        name: 'Neon Flicker',
        description: 'Neon light flicker',
        apply: (layer, startTime = 0, duration = 2) => {
            layer.addKeyframe('opacity', startTime, 1, 'linear');
            layer.addKeyframe('opacity', startTime + 0.1, 0.3, 'linear');
            layer.addKeyframe('opacity', startTime + 0.2, 1, 'linear');
            layer.addKeyframe('opacity', startTime + 0.25, 0.5, 'linear');
            layer.addKeyframe('opacity', startTime + 0.3, 1, 'linear');
            layer.glow = { enabled: true, color: layer.color, intensity: 20 };
        }
    },
    'shake': {
        name: 'Shake',
        description: 'Camera shake effect',
        apply: (layer, startTime = 0, duration = 0.5) => {
            layer.effects.push({
                type: 'shake',
                startTime,
                duration,
                intensity: 5
            });
        }
    },
    'cinematicReveal': {
        name: 'Cinematic Reveal',
        description: 'Cinematic text reveal',
        apply: (layer, startTime = 0, duration = 1.5) => {
            layer.addKeyframe('opacity', startTime, 0, 'linear');
            layer.addKeyframe('opacity', startTime + 0.3, 1, 'linear');
            layer.addKeyframe('y', startTime, layer.y + 50, 'linear');
            layer.addKeyframe('y', startTime + duration, layer.y, 'easeOut');
            layer.addKeyframe('blur', startTime, 10, 'linear');
            layer.addKeyframe('blur', startTime + duration, 0, 'easeOut');
        }
    },
    'smoothZoom': {
        name: 'Smooth Zoom',
        description: 'Smooth zoom in',
        apply: (layer, startTime = 0, duration = 1.2) => {
            layer.addKeyframe('scale', startTime, 0.5, 'linear');
            layer.addKeyframe('scale', startTime + duration, 1, 'easeInOut');
        }
    },
    'subtitlePop': {
        name: 'Subtitle Pop',
        description: 'Subtitle style pop in',
        apply: (layer, startTime = 0, duration = 0.4) => {
            layer.addKeyframe('scale', startTime, 0.8, 'linear');
            layer.addKeyframe('scale', startTime + duration, 1, 'backOut');
            layer.addKeyframe('opacity', startTime, 0, 'linear');
            layer.addKeyframe('opacity', startTime + duration * 0.5, 1, 'easeOut');
            layer.textShadow = { enabled: true, x: 1, y: 1, blur: 2, color: '#000000' };
        }
    },
    'tiktokCaption': {
        name: 'TikTok Caption',
        description: 'TikTok style caption',
        apply: (layer, startTime = 0, duration = 0.5) => {
            layer.addKeyframe('scale', startTime, 1.2, 'linear');
            layer.addKeyframe('scale', startTime + duration, 1, 'bounce');
            layer.fontWeight = '800';
            layer.textShadow = { enabled: true, x: 2, y: 0, blur: 0, color: '#ff0050' };
        }
    },
    'rgbSplit': {
        name: 'RGB Split',
        description: 'RGB channel split',
        apply: (layer, startTime = 0, duration = 0.8) => {
            layer.effects.push({
                type: 'rgbSplit',
                startTime,
                duration
            });
        }
    },
    'blurReveal': {
        name: 'Blur Reveal',
        description: 'Blur to clear reveal',
        apply: (layer, startTime = 0, duration = 1) => {
            layer.addKeyframe('blur', startTime, 15, 'linear');
            layer.addKeyframe('blur', startTime + duration, 0, 'easeOut');
            layer.addKeyframe('opacity', startTime, 0, 'linear');
            layer.addKeyframe('opacity', startTime + 0.2, 1, 'linear');
        }
    }
};


// ============================================
// Stage Manager
// ============================================
class StageManager {
    constructor(app) {
        this.app = app;
        this.stage = document.getElementById('stage');
        this.stageContent = document.getElementById('stage-content');
        this.gridOverlay = document.getElementById('grid-overlay');
        this.rulerH = document.getElementById('ruler-h');
        this.rulerV = document.getElementById('ruler-v');
        this.snapGuides = document.getElementById('snap-guides');

        this.width = 1920;
        this.height = 1080;
        this.zoom = this.calculateOptimalZoom();
        this.showGrid = false;
        this.showRulers = false;
        this.gridSize = 40;

        this.dragState = null;
        this.resizeState = null;
        this.rotateState = null;

        this.init();
    }

    init() {
        this.updateStageSize();
        this.setupEventListeners();
    }

    updateStageSize() {
        this.stage.style.width = `${this.width}px`;
        this.stage.style.height = `${this.height}px`;
        this.applyZoom();
    }

    calculateOptimalZoom() {
        // Calculate zoom to fit stage within available viewport
        const headerHeight = 48;
        const timelineHeight = 200;
        const stageControlsHeight = 40;
        const padding = 40;

        const availableWidth = window.innerWidth - 520; // minus panels
        const availableHeight = window.innerHeight - headerHeight - timelineHeight - stageControlsHeight - padding;

        const zoomX = availableWidth / this.width;
        const zoomY = availableHeight / this.height;

        // Use the smaller zoom to fit entirely, with a minimum of 0.25
        return Math.max(0.25, Math.min(zoomX, zoomY, 1.0));
    }

    applyZoom() {
        const scale = this.zoom;
        this.stage.style.transform = `scale(${scale})`;
        document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
    }

    setZoom(value) {
        this.zoom = Utils.clamp(value, 0.1, 2);
        this.applyZoom();
    }

    setupEventListeners() {
        // Stage mouse events for drag/resize/rotate
        this.stage.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Touch support
        this.stage.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onMouseUp.bind(this));
    }

    onMouseDown(e) {
        // Don't deselect if clicking on handles
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) {
            const target = e.target.closest('.text-layer');
            if (target) {
                const layerId = target.dataset.layerId;
                const layer = this.app.getLayerById(layerId);
                if (layer) {
                    this.app.selectLayer(layer);
                    if (e.target.classList.contains('resize-handle')) {
                        this.startResize(e, layer, e.target.dataset.handle);
                    } else {
                        this.startRotate(e, layer);
                    }
                }
            }
            e.preventDefault();
            return;
        }

        const target = e.target.closest('.text-layer');
        if (!target) {
            // Only deselect if clicking on stage content area, not on UI
            if (e.target.closest('#stage-content')) {
                this.app.selectLayer(null);
            }
            return;
        }

        const layerId = target.dataset.layerId;
        const layer = this.app.getLayerById(layerId);
        if (!layer) return;

        this.app.selectLayer(layer);
        this.startDrag(e, layer);
        e.preventDefault();
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: target,
                bubbles: true
            });
            this.onMouseDown(mouseEvent);
        }
        e.preventDefault();
    }

    startDrag(e, layer) {
        const rect = this.stage.getBoundingClientRect();
        this.dragState = {
            layer,
            startX: e.clientX,
            startY: e.clientY,
            layerStartX: layer.x,
            layerStartY: layer.y,
            stageRect: rect,
            zoom: this.zoom
        };
    }

    startResize(e, layer, handle) {
        this.resizeState = {
            layer,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startSize: layer.fontSize,
            startScale: layer.scale
        };
    }

    startRotate(e, layer) {
        const rect = this.stage.getBoundingClientRect();
        const centerX = rect.left + (layer.x * this.zoom);
        const centerY = rect.top + (layer.y * this.zoom);
        this.rotateState = {
            layer,
            centerX,
            centerY,
            startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
            startRotation: layer.rotation
        };
    }

    onMouseMove(e) {
        if (this.dragState) {
            const zoom = this.dragState.zoom || this.zoom;
            const dx = (e.clientX - this.dragState.startX) / zoom;
            const dy = (e.clientY - this.dragState.startY) / zoom;

            let newX = this.dragState.layerStartX + dx;
            let newY = this.dragState.layerStartY + dy;

            // Snap to grid
            if (this.showGrid) {
                newX = Utils.snapToGrid(newX, this.gridSize);
                newY = Utils.snapToGrid(newY, this.gridSize);
            }

            // Snap to center
            const snapThreshold = 10;
            const centerX = this.width / 2;
            const centerY = this.height / 2;
            if (Math.abs(newX - centerX) < snapThreshold) {
                newX = centerX;
                this.showSnapGuide('v', centerX);
            }
            if (Math.abs(newY - centerY) < snapThreshold) {
                newY = centerY;
                this.showSnapGuide('h', centerY);
            }

            this.dragState.layer.x = newX;
            this.dragState.layer.y = newY;
            this.app.renderLayer(this.dragState.layer);
            this.app.onLayerModified();
        }

        if (this.resizeState) {
            const dx = e.clientX - this.resizeState.startX;
            const scaleDelta = 1 + (dx / 200);
            this.resizeState.layer.scale = Utils.clamp(
                this.resizeState.startScale * scaleDelta,
                0.1, 5
            );
            this.app.renderLayer(this.resizeState.layer);
            this.app.onLayerModified();
        }

        if (this.rotateState) {
            const angle = Math.atan2(
                e.clientY - this.rotateState.centerY,
                e.clientX - this.rotateState.centerX
            );
            const deltaAngle = (angle - this.rotateState.startAngle) * (180 / Math.PI);
            this.rotateState.layer.rotation = this.rotateState.startRotation + deltaAngle;
            this.app.renderLayer(this.rotateState.layer);
            this.app.onLayerModified();
        }
    }

    onTouchMove(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.onMouseMove(mouseEvent);
        }
        e.preventDefault();
    }

    onMouseUp() {
        if (this.dragState || this.resizeState || this.rotateState) {
            this.app.pushHistory();
        }
        this.dragState = null;
        this.resizeState = null;
        this.rotateState = null;
        this.clearSnapGuides();
    }

    showSnapGuide(type, pos) {
        this.clearSnapGuides();
        const guide = document.createElement('div');
        guide.className = `snap-guide snap-guide-${type}`;
        guide.style[type === 'h' ? 'top' : 'left'] = `${pos}px`;
        this.snapGuides.appendChild(guide);
    }

    clearSnapGuides() {
        this.snapGuides.innerHTML = '';
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridOverlay.classList.toggle('show', this.showGrid);
        document.getElementById('btn-grid').classList.toggle('active', this.showGrid);
    }

    toggleRulers() {
        this.showRulers = !this.showRulers;
        this.rulerH.classList.toggle('show', this.showRulers);
        this.rulerV.classList.toggle('show', this.showRulers);
        document.getElementById('btn-ruler').classList.toggle('active', this.showRulers);
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.zoom = this.calculateOptimalZoom();
        this.updateStageSize();
    }
}

// ============================================
// Timeline Manager
// ============================================
class TimelineManager {
    constructor(app) {
        this.app = app;
        this.currentTime = 0;
        this.totalTime = 5;
        this.isPlaying = false;
        this.isLooping = false;
        this.zoom = 50; // pixels per second

        this.playhead = document.getElementById('playhead');
        this.timelineTracks = document.getElementById('timeline-tracks');
        this.timelineRuler = document.getElementById('timeline-ruler');

        this.playbackStartTime = 0;
        this.playbackStartFrame = 0;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderRuler();
        this.updatePlayhead();
    }

    setupEventListeners() {
        // Playhead drag
        const handle = this.playhead.querySelector('.playhead-handle');
        let isDragging = false;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = this.timelineTracks.getBoundingClientRect();
            const x = e.clientX - rect.left + this.timelineTracks.scrollLeft;
            const time = Math.max(0, x / this.zoom);
            this.setTime(time);
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Timeline click to seek
        this.timelineTracks.addEventListener('click', (e) => {
            if (e.target.closest('.keyframe')) return;
            const rect = this.timelineTracks.getBoundingClientRect();
            const x = e.clientX - rect.left + this.timelineTracks.scrollLeft;
            const time = Math.max(0, x / this.zoom);
            this.setTime(time);
        });

        // Zoom
        document.getElementById('timeline-zoom').addEventListener('input', (e) => {
            this.zoom = parseInt(e.target.value);
            this.renderRuler();
            this.renderTracks();
        });
    }

    renderRuler() {
        this.timelineRuler.innerHTML = '';
        const totalWidth = this.totalTime * this.zoom;
        this.timelineRuler.style.width = `${totalWidth + 120}px`;
        this.timelineRuler.style.minWidth = '100%';

        for (let t = 0; t <= this.totalTime; t += 0.5) {
            const mark = document.createElement('div');
            mark.className = `timeline-ruler-mark ${t % 1 === 0 ? 'major' : ''}`;
            mark.style.left = `${t * this.zoom}px`;
            mark.textContent = t % 1 === 0 ? `${t}s` : '';
            this.timelineRuler.appendChild(mark);
        }
    }

    renderTracks() {
        this.timelineTracks.innerHTML = '';
        const totalWidth = this.totalTime * this.zoom;

        if (this.app.layers.length === 0) {
            return;
        }

        this.app.layers.forEach(layer => {
            const track = document.createElement('div');
            track.className = 'timeline-track';
            track.style.width = `${totalWidth + 120}px`;
            track.style.minWidth = '100%';

            const header = document.createElement('div');
            header.className = 'timeline-track-header';
            header.innerHTML = `<span>${layer.name}</span>`;
            header.title = layer.name;
            track.appendChild(header);

            const content = document.createElement('div');
            content.className = 'timeline-track-content';

            // Render keyframes for each property
            Object.entries(layer.keyframes).forEach(([prop, kfs]) => {
                kfs.forEach(kf => {
                    const kfEl = document.createElement('div');
                    kfEl.className = 'keyframe';
                    kfEl.style.left = `${kf.time * this.zoom}px`;
                    kfEl.title = `${prop}: ${kf.value} @ ${kf.time.toFixed(2)}s`;
                    kfEl.dataset.layerId = layer.id;
                    kfEl.dataset.property = prop;
                    kfEl.dataset.time = kf.time;

                    kfEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectKeyframe(kfEl, layer, prop, kf);
                    });

                    content.appendChild(kfEl);
                });
            });

            track.appendChild(content);
            this.timelineTracks.appendChild(track);
        });

        // Update playhead position
        this.updatePlayhead();
    }

    selectKeyframe(el, layer, property, keyframe) {
        document.querySelectorAll('.keyframe.selected').forEach(k => k.classList.remove('selected'));
        el.classList.add('selected');
        this.app.selectLayer(layer);
        this.setTime(keyframe.time);
    }

    updatePlayhead() {
        const x = this.currentTime * this.zoom;
        // Position playhead relative to timeline body (120px for track headers + time position)
        this.playhead.style.left = '0px';
        this.playhead.style.transform = `translateX(${120 + x}px)`;
        document.getElementById('current-time').textContent = Utils.formatTime(this.currentTime);
        document.getElementById('total-time').textContent = Utils.formatTime(this.totalTime);
    }

    setTime(time) {
        this.currentTime = Utils.clamp(time, 0, this.totalTime);
        this.updatePlayhead();
        this.app.renderAtTime(this.currentTime);
    }

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.playbackStartTime = performance.now();
        this.playbackStartFrame = this.currentTime;

        document.getElementById('btn-play').classList.add('active');
        document.getElementById('btn-pause').classList.remove('active');

        this.animate();
    }

    pause() {
        this.isPlaying = false;
        document.getElementById('btn-play').classList.remove('active');
        document.getElementById('btn-pause').classList.add('active');
    }

    stop() {
        this.isPlaying = false;
        this.setTime(0);
        document.getElementById('btn-play').classList.remove('active');
        document.getElementById('btn-pause').classList.remove('active');
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        document.getElementById('btn-loop').classList.toggle('active', this.isLooping);
    }

    animate() {
        if (!this.isPlaying) return;

        const elapsed = (performance.now() - this.playbackStartTime) / 1000;
        let newTime = this.playbackStartFrame + elapsed;

        if (newTime >= this.totalTime) {
            if (this.isLooping) {
                newTime = newTime % this.totalTime;
                this.playbackStartTime = performance.now();
                this.playbackStartFrame = 0;
            } else {
                this.stop();
                return;
            }
        }

        this.currentTime = newTime;
        this.updatePlayhead();
        this.app.renderAtTime(this.currentTime);

        requestAnimationFrame(() => this.animate());
    }

    addKeyframe() {
        const layer = this.app.selectedLayer;
        if (!layer) {
            Toast.show('Select a layer first', 'error');
            return;
        }

        // Add keyframes for all animated properties at current time
        const properties = ['x', 'y', 'scale', 'rotation', 'opacity', 'blur', 'letterSpacing', 'color'];
        let added = false;

        properties.forEach(prop => {
            const value = layer[prop];
            if (value !== undefined) {
                layer.addKeyframe(prop, this.currentTime, value);
                added = true;
            }
        });

        if (added) {
            this.renderTracks();
            Toast.show('Keyframe added', 'success');
            this.app.pushHistory();
        }
    }

    deleteKeyframe() {
        const selected = document.querySelector('.keyframe.selected');
        if (!selected) {
            Toast.show('Select a keyframe to delete', 'error');
            return;
        }

        const layerId = selected.dataset.layerId;
        const property = selected.dataset.property;
        const time = parseFloat(selected.dataset.time);

        const layer = this.app.getLayerById(layerId);
        if (layer) {
            layer.removeKeyframe(property, time);
            this.renderTracks();
            Toast.show('Keyframe deleted', 'success');
            this.app.pushHistory();
        }
    }
}


// ============================================
// Export System
// ============================================
class ExportSystem {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('export-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isExporting = false;
        this.cancelExport = false;
    }

    exportJSON() {
        const data = this.app.serialize();
        Utils.downloadFile(JSON.stringify(data, null, 2), 'text-motion-project.json');
        Toast.show('Project exported as JSON', 'success');
    }

    importJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.app.deserialize(data);
                Toast.show('Project imported successfully', 'success');
            } catch (err) {
                Toast.show('Invalid project file', 'error');
            }
        };
        reader.readAsText(file);
    }

    async exportGIF(options = {}) {
        const { fps = 30, quality = 10 } = options;
        return this.exportFrames(fps, 'gif', quality);
    }

    async exportWebM(options = {}) {
        const { fps = 30, quality = 0.9 } = options;
        return this.exportFrames(fps, 'webm', quality);
    }

    async exportPNGSequence(options = {}) {
        const { fps = 30 } = options;
        return this.exportFrames(fps, 'png');
    }

    async exportFrames(fps, format, quality) {
        if (this.isExporting) return;
        this.isExporting = true;
        this.cancelExport = false;

        const modal = document.getElementById('export-modal');
        const progressBar = document.getElementById('export-progress');
        const statusText = document.getElementById('export-status');
        const title = document.getElementById('export-title');

        modal.classList.add('show');
        title.textContent = `Exporting ${format.toUpperCase()}...`;

        const totalFrames = Math.ceil(this.app.timeline.totalTime * fps);
        const frameDuration = 1 / fps;

        // Set canvas size
        this.canvas.width = this.app.stage.width;
        this.canvas.height = this.app.stage.height;

        // Temporarily show canvas for captureStream (offscreen)
        this.canvas.style.display = 'block';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '-9999px';
        this.canvas.style.left = '-9999px';

        const frames = [];

        for (let i = 0; i < totalFrames; i++) {
            if (this.cancelExport) break;

            const time = i * frameDuration;
            const progress = ((i + 1) / totalFrames) * 100;

            progressBar.style.width = `${progress}%`;
            statusText.textContent = `Rendering frame ${i + 1} of ${totalFrames}...`;

            // Render frame to canvas
            await this.renderFrameToCanvas(time);

            if (format === 'png') {
                const blob = await new Promise(resolve => {
                    this.canvas.toBlob(resolve, 'image/png');
                });
                frames.push({ blob, index: i });
            } else if (format === 'gif' || format === 'webm') {
                frames.push(this.canvas.toDataURL('image/png'));
            }

            // Allow UI to update
            await new Promise(r => setTimeout(r, 0));
        }

        if (!this.cancelExport) {
            if (format === 'png') {
                await this.downloadPNGSequence(frames);
            } else if (format === 'gif') {
                await this.createGIF(frames, fps, quality);
            } else if (format === 'webm') {
                await this.createWebM(frames, fps);
            }
        }

        // Hide canvas again
        this.canvas.style.display = 'none';
        this.canvas.style.position = '';
        this.canvas.style.top = '';
        this.canvas.style.left = '';

        modal.classList.remove('show');
        this.isExporting = false;
        this.cancelExport = false;
    }

    async renderFrameToCanvas(time) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Render each layer
        this.app.layers.forEach(layer => {
            if (!layer.visible) return;
            this.renderLayerToCanvas(ctx, layer, time, w, h);
        });
    }

    renderLayerToCanvas(ctx, layer, time, stageW, stageH) {
        const x = layer.getValueAtTime('x', time);
        const y = layer.getValueAtTime('y', time);
        const scale = layer.getValueAtTime('scale', time);
        const rotation = layer.getValueAtTime('rotation', time);
        const opacity = layer.getValueAtTime('opacity', time);
        const blur = layer.getValueAtTime('blur', time);
        const letterSpacing = layer.getValueAtTime('letterSpacing', time);
        const color = layer.getValueAtTime('color', time);

        ctx.save();
        ctx.globalAlpha = opacity;

        if (blur > 0) {
            ctx.filter = `blur(${blur}px)`;
        }

        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);

        // Apply effects
        ctx.font = `${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}", sans-serif`;
        ctx.textAlign = layer.textAlign;
        ctx.textBaseline = 'middle';

        // Handle gradient
        if (layer.gradient && layer.gradient.enabled) {
            const gradient = ctx.createLinearGradient(
                -100, 0, 100, 0
            );
            layer.gradient.colors.forEach((c, i) => {
                gradient.addColorStop(i / (layer.gradient.colors.length - 1), c);
            });
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = color;
        }

        // Text shadow
        if (layer.textShadow && layer.textShadow.enabled) {
            ctx.shadowColor = layer.textShadow.color;
            ctx.shadowBlur = layer.textShadow.blur;
            ctx.shadowOffsetX = layer.textShadow.x;
            ctx.shadowOffsetY = layer.textShadow.y;
        }

        // Glow effect
        if (layer.glow && layer.glow.enabled) {
            ctx.shadowColor = layer.glow.color;
            ctx.shadowBlur = layer.glow.intensity;
        }

        // Draw text
        const lines = layer.text.split('\n');
        const lineHeight = layer.fontSize * layer.lineHeight;
        const totalHeight = lines.length * lineHeight;
        const startY = -(totalHeight / 2) + (lineHeight / 2);

        lines.forEach((line, i) => {
            const lineY = startY + (i * lineHeight);

            // Stroke
            if (layer.stroke && layer.stroke.enabled) {
                ctx.lineWidth = layer.stroke.width;
                ctx.strokeStyle = layer.stroke.color;
                ctx.strokeText(line, 0, lineY);
            }

            // Fill
            ctx.fillText(line, 0, lineY);
        });

        ctx.restore();
    }

    async downloadPNGSequence(frames) {
        // Download each frame
        for (const frame of frames) {
            const url = URL.createObjectURL(frame.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `frame_${frame.index.toString().padStart(4, '0')}.png`;
            a.click();
            URL.revokeObjectURL(url);
            await new Promise(r => setTimeout(r, 50)); // Prevent browser blocking
        }
        Toast.show('PNG sequence exported', 'success');
    }

    async createGIF(frames, fps, quality) {
        // Simple GIF implementation using a lightweight approach
        // For production, you'd want to use a library like gif.js
        Toast.show('GIF export requires gif.js library. Using PNG sequence instead.', 'info');
        // Fallback to showing frames as data URLs for manual processing
        
    }

    async createWebM(frames, fps) {
        // Create a temporary video canvas
        const videoCanvas = document.createElement('canvas');
        videoCanvas.width = this.canvas.width;
        videoCanvas.height = this.canvas.height;
        const vctx = videoCanvas.getContext('2d');

        // Use MediaRecorder for WebM export
        const stream = videoCanvas.captureStream(fps);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
            ? 'video/webm;codecs=vp9' 
            : 'video/webm';

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'animation.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Toast.show('WebM exported successfully', 'success');
        };

        mediaRecorder.start();

        // Render frames
        for (let i = 0; i < frames.length; i++) {
            const img = new Image();
            img.src = frames[i];
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    vctx.drawImage(img, 0, 0);
                    resolve();
                };
                img.onerror = reject;
            });
            // Small delay to let the stream capture the frame
            await new Promise(r => setTimeout(r, 1000 / fps));
        }

        mediaRecorder.stop();
    }

    cancel() {
        this.cancelExport = true;
    }
}

// ============================================
// Properties Panel
// ============================================
class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('properties-content');
        this.currentLayer = null;
    }

    render(layer) {
        this.currentLayer = layer;

        if (!layer) {
            this.container.innerHTML = '<div class="no-selection">Select a layer to edit properties</div>';
            return;
        }

        this.container.innerHTML = '';

        // Text Content
        this.addGroup('Text', [
            this.createTextarea('Text', layer.text, (v) => {
                layer.text = v;
                this.app.renderLayer(layer);
                this.app.onLayerModified();
            }),
            this.createInput('Name', layer.name, (v) => {
                layer.name = v;
                this.app.renderLayersList();
            })
        ]);

        // Transform
        this.addGroup('Transform', [
            this.createNumberInput('X', layer.x, (v) => { layer.x = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createNumberInput('Y', layer.y, (v) => { layer.y = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createNumberInput('Scale', layer.scale, (v) => { layer.scale = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 0.01, 0.1, 5),
            this.createNumberInput('Rotation', layer.rotation, (v) => { layer.rotation = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 1, -360, 360),
            this.createNumberInput('Opacity', layer.opacity, (v) => { layer.opacity = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 0.01, 0, 1),
        ]);

        // Typography
        this.addGroup('Typography', [
            this.createSelect('Font', layer.fontFamily, [
                'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
                'Courier New', 'Verdana', 'Impact', 'Comic Sans MS',
                'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
                'Poppins', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather'
            ], (v) => { layer.fontFamily = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createNumberInput('Size', layer.fontSize, (v) => { layer.fontSize = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 1, 1, 500),
            this.createSelect('Weight', layer.fontWeight, ['100', '200', '300', '400', '500', '600', '700', '800', '900'], (v) => { layer.fontWeight = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createNumberInput('Line Height', layer.lineHeight, (v) => { layer.lineHeight = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 0.1, 0.1, 5),
            this.createNumberInput('Letter Spacing', layer.letterSpacing, (v) => { layer.letterSpacing = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 0.5, -50, 100),
            this.createSelect('Align', layer.textAlign, ['left', 'center', 'right', 'justify'], (v) => { layer.textAlign = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createColorInput('Color', layer.color, (v) => { layer.color = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
        ]);

        // Effects
        this.addGroup('Effects', [
            this.createToggle('Text Shadow', layer.textShadow.enabled, (v) => { layer.textShadow.enabled = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createToggle('Glow', layer.glow.enabled, (v) => { layer.glow.enabled = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createToggle('Stroke', layer.stroke.enabled, (v) => { layer.stroke.enabled = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createToggle('Gradient', layer.gradient.enabled, (v) => { layer.gradient.enabled = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
            this.createNumberInput('Blur', layer.blur, (v) => { layer.blur = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 0.5, 0, 50),
            this.createToggle('Vertical', layer.vertical, (v) => { layer.vertical = v; this.app.renderLayer(layer); this.app.onLayerModified(); }),
        ]);

        // 3D Transform
        this.addGroup('3D Transform', [
            this.createNumberInput('Rotate X', layer.rotateX, (v) => { layer.rotateX = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 1, -360, 360),
            this.createNumberInput('Rotate Y', layer.rotateY, (v) => { layer.rotateY = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 1, -360, 360),
            this.createNumberInput('Perspective', layer.perspective, (v) => { layer.perspective = v; this.app.renderLayer(layer); this.app.onLayerModified(); }, 100, 100, 5000),
        ]);

        // Animation Presets
        this.addGroup('Animation Presets', [
            this.createPresetButtons()
        ]);
    }

    addGroup(title, elements) {
        const group = document.createElement('div');
        group.className = 'property-group';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'property-group-title';
        groupTitle.textContent = title;
        group.appendChild(groupTitle);

        elements.forEach(el => {
            if (el) group.appendChild(el);
        });

        this.container.appendChild(group);
    }

    createRow(label, input) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'property-label';
        labelEl.textContent = label;

        const inputEl = document.createElement('div');
        inputEl.className = 'property-input';
        inputEl.appendChild(input);

        row.appendChild(labelEl);
        row.appendChild(inputEl);
        return row;
    }

    createInput(label, value, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.addEventListener('input', (e) => onChange(e.target.value));
        return this.createRow(label, input);
    }

    createTextarea(label, value, onChange) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.rows = 3;
        textarea.addEventListener('input', (e) => onChange(e.target.value));
        return this.createRow(label, textarea);
    }

    createNumberInput(label, value, onChange, step = 1, min = -9999, max = 9999) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '6px';
        wrapper.style.flex = '1';

        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.step = step;
        input.min = min;
        input.max = max;
        input.style.flex = '1';
        input.addEventListener('input', (e) => onChange(parseFloat(e.target.value) || 0));

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        slider.style.width = '60px';
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            onChange(parseFloat(e.target.value));
        });

        wrapper.appendChild(input);
        wrapper.appendChild(slider);
        return this.createRow(label, wrapper);
    }

    createSelect(label, value, options, onChange) {
        const select = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === value) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', (e) => onChange(e.target.value));
        return this.createRow(label, select);
    }

    createColorInput(label, value, onChange) {
        const wrapper = document.createElement('div');
        wrapper.className = 'color-input-wrapper';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = value;
        textInput.style.flex = '1';

        colorInput.addEventListener('input', (e) => {
            textInput.value = e.target.value;
            onChange(e.target.value);
        });

        textInput.addEventListener('input', (e) => {
            colorInput.value = e.target.value;
            onChange(e.target.value);
        });

        wrapper.appendChild(colorInput);
        wrapper.appendChild(textInput);
        return this.createRow(label, wrapper);
    }

    createToggle(label, value, onChange) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.flex = '1';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.fontSize = '12px';
        labelEl.style.color = 'var(--text-secondary)';

        const toggle = document.createElement('div');
        toggle.className = `toggle-switch ${value ? 'active' : ''}`;
        toggle.addEventListener('click', () => {
            const newValue = !toggle.classList.contains('active');
            toggle.classList.toggle('active', newValue);
            onChange(newValue);
        });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(toggle);
        return this.createRow('', wrapper);
    }

    createPresetButtons() {
        const container = document.createElement('div');
        container.className = 'preset-buttons';

        Object.entries(AnimationPresets).forEach(([key, preset]) => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.name;
            btn.title = preset.description;
            btn.addEventListener('click', () => {
                if (this.currentLayer) {
                    preset.apply(this.currentLayer, this.app.timeline.currentTime);
                    this.app.renderLayer(this.currentLayer);
                    this.app.timeline.renderTracks();
                    this.app.pushHistory();
                    Toast.show(`Applied: ${preset.name}`, 'success');
                }
            });
            container.appendChild(btn);
        });

        return container;
    }
}


// ============================================
// Main Application
// ============================================
class TextMotionStudio {
    constructor() {
        this.layers = [];
        this.selectedLayer = null;
        this.nextLayerNum = 1;

        this.stage = new StageManager(this);
        this.timeline = new TimelineManager(this);
        this.properties = new PropertiesPanel(this);
        this.exportSystem = new ExportSystem(this);
        this.history = new HistoryManager();
        this.autosave = new AutosaveManager();
        this.fpsMonitor = new FPSMonitor();

        this.isModified = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFonts();

        // Create default layer
        this.addLayer(new TextLayer({
            name: 'Text Layer 1',
            text: 'Text Motion Studio',
            x: 960,
            y: 540,
            fontSize: 72,
            fontWeight: '700',
            textAlign: 'center'
        }));

        // Setup autosave
        this.autosave.start(() => this.serialize(), 30000);

        // Populate presets panel
        this.populatePresetsPanel();

        // Try load autosave
        const saved = this.autosave.load();
        if (saved) {
            // Don't auto-load, let user decide
            
        }

        // Start render loop
        this.renderLoop();

        // Initial push to history
        this.pushHistory();

        // Calculate optimal zoom after DOM is ready
        setTimeout(() => {
            this.stage.zoom = this.stage.calculateOptimalZoom();
            this.stage.applyZoom();
        }, 100);

        Toast.show('Text Motion Studio loaded', 'success');

        // Show welcome modal on first visit
        const hasVisited = localStorage.getItem('tms_visited');
        if (!hasVisited) {
            const welcomeModal = document.getElementById('welcome-modal');
            welcomeModal.classList.add('show');
            document.getElementById('btn-welcome-close').addEventListener('click', () => {
                welcomeModal.classList.remove('show');
                localStorage.setItem('tms_visited', 'true');
            });
        }
    }

    setupEventListeners() {
        // Double click on stage to add layer at position
        this.stage.stageContent.addEventListener('dblclick', (e) => {
            if (e.target === this.stage.stageContent) {
                const rect = this.stage.stage.getBoundingClientRect();
                const x = (e.clientX - rect.left) / this.stage.zoom;
                const y = (e.clientY - rect.top) / this.stage.zoom;
                const layer = new TextLayer({
                    name: `Text Layer ${this.nextLayerNum++}`,
                    x: x,
                    y: y,
                    text: 'New Text'
                });
                this.addLayer(layer);
                this.selectLayer(layer);
            }
        });

        // Add layer
        document.getElementById('btn-add-layer').addEventListener('click', () => {
            const layer = new TextLayer({
                name: `Text Layer ${this.nextLayerNum++}`,
                x: this.stage.width / 2,
                y: this.stage.height / 2,
                text: 'New Text'
            });
            this.addLayer(layer);
            this.selectLayer(layer);
        });

        // Playback controls
        document.getElementById('btn-play').addEventListener('click', () => this.timeline.play());
        document.getElementById('btn-pause').addEventListener('click', () => this.timeline.pause());
        document.getElementById('btn-stop').addEventListener('click', () => this.timeline.stop());
        document.getElementById('btn-loop').addEventListener('click', () => this.timeline.toggleLoop());

        // Keyframe controls
        document.getElementById('btn-add-kf').addEventListener('click', () => this.timeline.addKeyframe());
        document.getElementById('btn-del-kf').addEventListener('click', () => this.timeline.deleteKeyframe());

        // Stage controls
        document.getElementById('btn-grid').addEventListener('click', () => this.stage.toggleGrid());
        document.getElementById('btn-ruler').addEventListener('click', () => this.stage.toggleRulers());
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.stage.setZoom(this.stage.zoom + 0.1));
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.stage.setZoom(this.stage.zoom - 0.1));

        // Stage size
        document.getElementById('stage-size-select').addEventListener('change', (e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            if (w && h) this.stage.setSize(w, h);
        });

        // Fullscreen
        document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('btn-fps').addEventListener('click', () => this.toggleFPSMonitor());

        // Undo/Redo
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());

        // Export
        document.getElementById('btn-export').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('export-dropdown').classList.toggle('show');
        });

        document.addEventListener('click', () => {
            document.getElementById('export-dropdown').classList.remove('show');
        });

        // Presets panel toggle (add a button for it in header)
        const presetsBtn = document.createElement('button');
        presetsBtn.id = 'btn-presets';
        presetsBtn.className = 'btn-icon';
        presetsBtn.title = 'Animation Presets (P)';
        presetsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9"/></svg>';
        presetsBtn.addEventListener('click', () => {
            document.getElementById('presets-panel').classList.toggle('show');
        });
        document.querySelector('.header-right').insertBefore(presetsBtn, document.getElementById('btn-export'));

        document.getElementById('btn-close-presets').addEventListener('click', () => {
            document.getElementById('presets-panel').classList.remove('show');
        });

        // Keyboard shortcut for presets
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'p' || e.key === 'P') {
                document.getElementById('presets-panel').classList.toggle('show');
            }
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                const welcomeModal = document.getElementById('welcome-modal');
                welcomeModal.classList.toggle('show');
            }
        });

        document.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.export;
                this.handleExport(type);
            });
        });

        // Import file
        document.getElementById('import-file').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.exportSystem.importJSON(e.target.files[0]);
            }
        });

        // Cancel export
        document.getElementById('btn-cancel-export').addEventListener('click', () => {
            this.exportSystem.cancel();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === ' ' && !e.repeat) {
                e.preventDefault();
                if (this.timeline.isPlaying) this.timeline.pause();
                else this.timeline.play();
            }
            if (e.key === 's' || e.key === 'S') {
                if (!e.ctrlKey && !e.metaKey) this.timeline.stop();
            }
            if (e.key === 'l' || e.key === 'L') this.timeline.toggleLoop();
            if (e.key === 'k' || e.key === 'K') this.timeline.addKeyframe();
            if (e.key === 'g' || e.key === 'G') this.stage.toggleGrid();
            if (e.key === 'r' || e.key === 'R') this.stage.toggleRulers();
            if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedLayer) this.deleteLayer(this.selectedLayer);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                this.redo();
            }
        });

        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.stage.zoom = this.stage.calculateOptimalZoom();
            this.stage.applyZoom();
        }, 200));

        // Visibility change for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.timeline.isPlaying) {
                this.timeline.pause();
            }
        });
    }

    loadFonts() {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Open+Sans:wght@300;400;600;700;800&family=Lato:wght@100;300;400;700;900&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Oswald:wght@200;300;400;500;600;700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Raleway:wght@100;200;300;400;500;600;700;800;900&family=Nunito:wght@200;300;400;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Merriweather:wght@300;400;700;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    addLayer(layer) {
        this.layers.push(layer);
        this.renderLayer(layer);
        this.renderLayersList();
        this.timeline.renderTracks();
        this.isModified = true;
    }

    moveLayer(layer, direction) {
        const index = this.layers.indexOf(layer);
        if (index === -1) return;

        if (direction === 'up' && index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
        } else if (direction === 'down' && index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
        }

        // Re-render z-index
        this.layers.forEach((l, i) => {
            if (l.element) l.element.style.zIndex = i;
        });

        this.renderLayersList();
        this.pushHistory();
    }

    deleteLayer(layer) {
        const index = this.layers.indexOf(layer);
        if (index > -1) {
            if (layer.element) layer.element.remove();
            this.layers.splice(index, 1);
            if (this.selectedLayer === layer) {
                this.selectLayer(this.layers[0] || null);
            }
            this.renderLayersList();
            this.timeline.renderTracks();
            this.pushHistory();
            Toast.show('Layer deleted', 'info');
        }
    }

    selectLayer(layer) {
        // Deselect previous
        if (this.selectedLayer && this.selectedLayer.element) {
            this.selectedLayer.element.classList.remove('selected');
        }

        this.selectedLayer = layer;

        // Select new
        if (layer && layer.element) {
            layer.element.classList.add('selected');
        }

        this.properties.render(layer);
        this.renderLayersList();
    }

    getLayerById(id) {
        return this.layers.find(l => l.id === id);
    }

    renderLayer(layer) {
        if (!layer.element) {
            layer.element = document.createElement('div');
            layer.element.className = 'text-layer';
            layer.element.dataset.layerId = layer.id;

            // Add handles
            ['nw', 'ne', 'sw', 'se'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${pos}`;
                handle.dataset.handle = pos;
                layer.element.appendChild(handle);
            });

            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'rotate-handle';
            layer.element.appendChild(rotateHandle);

            this.stage.stageContent.appendChild(layer.element);
        }

        // Apply styles
        const el = layer.element;
        el.textContent = layer.text;
        el.style.left = `${layer.x}px`;
        el.style.top = `${layer.y}px`;
        el.style.zIndex = this.layers.indexOf(layer);
        el.style.fontFamily = layer.fontFamily;
        el.style.fontSize = `${layer.fontSize}px`;
        el.style.fontWeight = layer.fontWeight;
        el.style.lineHeight = layer.lineHeight;
        el.style.letterSpacing = `${layer.letterSpacing}px`;
        el.style.textAlign = layer.textAlign;
        el.style.color = layer.color;
        el.style.opacity = layer.opacity;
        el.style.transform = `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg)`;
        el.style.perspective = `${layer.perspective}px`;
        el.style.filter = layer.blur > 0 ? `blur(${layer.blur}px)` : 'none';
        el.style.writingMode = layer.vertical ? 'vertical-rl' : 'horizontal-tb';
        el.style.display = layer.visible ? 'block' : 'none';

        // Text shadow
        if (layer.textShadow && layer.textShadow.enabled) {
            el.style.textShadow = `${layer.textShadow.x}px ${layer.textShadow.y}px ${layer.textShadow.blur}px ${layer.textShadow.color}`;
        } else {
            el.style.textShadow = 'none';
        }

        // Glow
        if (layer.glow && layer.glow.enabled) {
            el.style.textShadow = `0 0 ${layer.glow.intensity}px ${layer.glow.color}, 0 0 ${layer.glow.intensity * 2}px ${layer.glow.color}`;
        }

        // Stroke
        if (layer.stroke && layer.stroke.enabled) {
            el.style.webkitTextStroke = `${layer.stroke.width}px ${layer.stroke.color}`;
        } else {
            el.style.webkitTextStroke = 'none';
        }

        // Gradient
        if (layer.gradient && layer.gradient.enabled) {
            el.style.background = `linear-gradient(${layer.gradient.angle}deg, ${layer.gradient.colors.join(', ')})`;
            el.style.webkitBackgroundClip = 'text';
            el.style.webkitTextFillColor = 'transparent';
            el.style.backgroundClip = 'text';
        } else {
            el.style.background = 'none';
            el.style.webkitBackgroundClip = 'initial';
            el.style.webkitTextFillColor = 'initial';
        }

        // Background blur / Glassmorphism
        if (layer.backgroundBlur && layer.backgroundBlur.enabled) {
            el.style.backdropFilter = `blur(${layer.backgroundBlur.amount}px)`;
        }
        if (layer.glassmorphism && layer.glassmorphism.enabled) {
            el.style.background = 'rgba(255, 255, 255, 0.1)';
            el.style.backdropFilter = 'blur(10px)';
            el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            el.style.padding = '10px 20px';
            el.style.borderRadius = '8px';
        }
    }

    renderAtTime(time) {
        this.layers.forEach((layer, index) => {
            if (!layer.visible) {
                if (layer.element) layer.element.style.display = 'none';
                return;
            }

            const el = layer.element;
            if (!el) return;

            el.style.display = 'block';
            el.style.zIndex = index;

            // Interpolate values
            const x = layer.getValueAtTime('x', time);
            const y = layer.getValueAtTime('y', time);
            const scale = layer.getValueAtTime('scale', time);
            const rotation = layer.getValueAtTime('rotation', time);
            const opacity = layer.getValueAtTime('opacity', time);
            const blur = layer.getValueAtTime('blur', time);
            const letterSpacing = layer.getValueAtTime('letterSpacing', time);
            const color = layer.getValueAtTime('color', time);

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;
            el.style.opacity = opacity;
            el.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
            el.style.letterSpacing = `${letterSpacing}px`;
            if (color) el.style.color = color;

            // Apply effects
            this.applyEffects(layer, time);
        });
    }

    applyEffects(layer, time) {
        layer.effects.forEach(effect => {
            if (time < effect.startTime || time > effect.startTime + effect.duration) return;

            const el = layer.element;
            if (!el) return;

            switch (effect.type) {
                case 'typewriter':
                    const progress = (time - effect.startTime) / effect.duration;
                    const chars = Math.floor(progress * layer.text.length);
                    el.textContent = layer.text.substring(0, chars);
                    break;
                case 'glitch':
                    if (Math.random() > 0.7) {
                        el.style.transform = `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg) translate(${(Math.random() - 0.5) * effect.intensity}px, ${(Math.random() - 0.5) * effect.intensity}px)`;
                    }
                    break;
                case 'shake':
                    const shakeX = (Math.random() - 0.5) * effect.intensity;
                    const shakeY = (Math.random() - 0.5) * effect.intensity;
                    el.style.transform = `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg) translate(${shakeX}px, ${shakeY}px)`;
                    break;
                case 'rgbSplit':
                    const offset = 3;
                    el.style.textShadow = `${offset}px 0 #ff0000, -${offset}px 0 #00ffff`;
                    break;
            }
        });
    }

    renderLayersList() {
        const list = document.getElementById('layers-list');
        list.innerHTML = '';

        [...this.layers].reverse().forEach(layer => {
            const originalIndex = this.layers.indexOf(layer);
            const item = document.createElement('div');
            item.className = `layer-item ${layer === this.selectedLayer ? 'selected' : ''} ${!layer.visible ? 'hidden' : ''}`;

            // Visibility toggle
            const visibility = document.createElement('div');
            visibility.className = 'layer-visibility';
            visibility.innerHTML = layer.visible 
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            visibility.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                this.renderLayer(layer);
                this.renderLayersList();
            });

            const typeIcon = document.createElement('div');
            typeIcon.className = 'layer-type-icon';
            typeIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';

            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = layer.name;

            item.appendChild(visibility);
            item.appendChild(typeIcon);
            item.appendChild(name);

            item.addEventListener('click', () => this.selectLayer(layer));

            // Right-click context menu
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showLayerContextMenu(e, layer, originalIndex);
            });

            list.appendChild(item);
        });
    }

    onLayerModified() {
        this.isModified = true;
        this.timeline.renderTracks();
    }

    pushHistory() {
        this.history.push(this.serialize());
        this.updateUndoRedoButtons();
    }

    undo() {
        const state = this.history.undo();
        if (state) {
            this.deserialize(state);
            Toast.show('Undo', 'info');
        }
        this.updateUndoRedoButtons();
    }

    redo() {
        const state = this.history.redo();
        if (state) {
            this.deserialize(state);
            Toast.show('Redo', 'info');
        }
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        document.getElementById('btn-undo').style.opacity = this.history.canUndo() ? '1' : '0.3';
        document.getElementById('btn-redo').style.opacity = this.history.canRedo() ? '1' : '0.3';
    }

    toggleFPSMonitor() {
        const fpsEl = document.getElementById('fps-display');
        const parent = document.getElementById('btn-fps');
        if (fpsEl.style.display === 'none') {
            fpsEl.style.display = 'inline';
            parent.classList.remove('active');
        } else {
            fpsEl.style.display = 'inline';
            parent.classList.add('active');
        }
    }

    showLayerContextMenu(e, layer, index) {
        // Remove existing context menu
        document.querySelectorAll('.layer-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'layer-context-menu';
        menu.style.cssText = `
            position: fixed;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 4px;
            z-index: 1000;
            box-shadow: var(--shadow-md);
            min-width: 150px;
        `;
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        const actions = [
            { label: 'Duplicate', action: () => {
                const clone = layer.clone();
                clone.name = layer.name + ' Copy';
                clone.x += 20;
                clone.y += 20;
                this.layers.splice(index + 1, 0, clone);
                this.renderLayer(clone);
                this.renderLayersList();
                this.timeline.renderTracks();
                this.pushHistory();
            }},
            { label: 'Move Up', action: () => this.moveLayer(layer, 'up') },
            { label: 'Move Down', action: () => this.moveLayer(layer, 'down') },
            { label: 'Delete', action: () => this.deleteLayer(layer) }
        ];

        actions.forEach(({ label, action }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `
                display: block;
                width: 100%;
                padding: 6px 10px;
                background: transparent;
                border: none;
                color: var(--text-primary);
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                font-size: 12px;
            `;
            btn.addEventListener('mouseenter', () => btn.style.background = 'var(--bg-hover)');
            btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
            btn.addEventListener('click', () => {
                action();
                menu.remove();
            });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        // Close on click outside
        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    toggleFullscreen() {
        const isFullscreen = document.body.classList.toggle('fullscreen-mode');
        document.querySelectorAll('.app-header, .timeline-container, .panel, .stage-controls').forEach(el => {
            el.classList.toggle('fullscreen-hidden', isFullscreen);
        });
    }

    handleExport(type) {
        switch (type) {
            case 'json':
                this.exportSystem.exportJSON();
                break;
            case 'import':
                document.getElementById('import-file').click();
                break;
            case 'gif':
                this.exportSystem.exportGIF();
                break;
            case 'webm':
                this.exportSystem.exportWebM();
                break;
            case 'png':
                this.exportSystem.exportPNGSequence();
                break;
        }
        document.getElementById('export-dropdown').classList.remove('show');
    }

    populatePresetsPanel() {
        const grid = document.getElementById('presets-grid');
        grid.innerHTML = '';

        Object.entries(AnimationPresets).forEach(([key, preset]) => {
            const card = document.createElement('div');
            card.className = 'preset-card';

            const name = document.createElement('div');
            name.className = 'preset-name';
            name.textContent = preset.name;

            const preview = document.createElement('div');
            preview.className = 'preset-preview';
            preview.textContent = 'Aa';

            card.appendChild(name);
            card.appendChild(preview);

            card.addEventListener('click', () => {
                if (this.selectedLayer) {
                    preset.apply(this.selectedLayer, this.timeline.currentTime);
                    this.renderLayer(this.selectedLayer);
                    this.timeline.renderTracks();
                    this.pushHistory();
                    Toast.show(`Applied: ${preset.name}`, 'success');
                } else {
                    Toast.show('Select a layer first', 'error');
                }
            });

            grid.appendChild(card);
        });
    }

    serialize() {
        return {
            version: '1.0',
            stage: {
                width: this.stage.width,
                height: this.stage.height
            },
            timeline: {
                totalTime: this.timeline.totalTime
            },
            layers: this.layers.map(l => ({
                id: l.id,
                name: l.name,
                type: l.type,
                visible: l.visible,
                x: l.x,
                y: l.y,
                scale: l.scale,
                rotation: l.rotation,
                opacity: l.opacity,
                text: l.text,
                fontFamily: l.fontFamily,
                fontSize: l.fontSize,
                fontWeight: l.fontWeight,
                lineHeight: l.lineHeight,
                letterSpacing: l.letterSpacing,
                textAlign: l.textAlign,
                color: l.color,
                textShadow: l.textShadow,
                glow: l.glow,
                stroke: l.stroke,
                backgroundBlur: l.backgroundBlur,
                glassmorphism: l.glassmorphism,
                gradient: l.gradient,
                blur: l.blur,
                vertical: l.vertical,
                rotateX: l.rotateX,
                rotateY: l.rotateY,
                perspective: l.perspective,
                keyframes: l.keyframes,
                effects: l.effects
            }))
        };
    }

    deserialize(data) {
        // Clear existing
        this.layers.forEach(l => { if (l.element) l.element.remove(); });
        this.layers = [];

        // Restore stage
        if (data.stage) {
            this.stage.setSize(data.stage.width, data.stage.height);
        }

        // Restore timeline
        if (data.timeline) {
            this.timeline.totalTime = data.timeline.totalTime || 5;
        }

        // Restore layers
        if (data.layers) {
            data.layers.forEach(layerData => {
                const layer = new TextLayer(layerData);
                layer.id = layerData.id || Utils.uid();
                layer.keyframes = layerData.keyframes || {};
                layer.effects = layerData.effects || [];
                this.layers.push(layer);
                this.renderLayer(layer);
            });
        }

        this.nextLayerNum = this.layers.length + 1;
        this.selectLayer(this.layers[0] || null);
        this.renderLayersList();
        this.timeline.renderTracks();
        this.timeline.renderRuler();
        this.timeline.setTime(0);
    }

    renderLoop() {
        if (document.hidden) {
            requestAnimationFrame(() => this.renderLoop());
            return;
        }

        this.fpsMonitor.update();
        requestAnimationFrame(() => this.renderLoop());
    }
}

// ============================================
// Initialize Application
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TextMotionStudio();
});
