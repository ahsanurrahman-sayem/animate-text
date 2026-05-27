# Text Motion Studio

A production-ready, browser-based text animation creator and preview studio. Build stunning text animations with keyframes, effects, and professional motion graphics tools — all in your browser, no backend required.

![Text Motion Studio](https://via.placeholder.com/800x450/0d0d0d/00d4ff?text=Text+Motion+Studio)

## Features

### Core Features
- **Live Text Preview** — Real-time rendering on a large canvas/stage
- **Multiple Text Layers** — Create and manage multiple text layers
- **Layer Selection & Visibility** — Select, show/hide individual layers
- **Interactive Transform** — Drag to move, resize handles, rotate handles
- **Snap Guides** — Snap to grid and center guides
- **Ruler & Grid** — Visual guides for precise positioning

### Timeline System
- **Keyframe-based Animation** — Animate any property over time
- **Draggable Playhead** — Scrub through your animation
- **Add/Remove Keyframes** — Easy keyframe management
- **Per-property Keyframes**:
  - Position (X, Y)
  - Scale
  - Rotation
  - Opacity
  - Blur
  - Letter Spacing
  - Color
- **Playback Controls**: Play, Pause, Stop, Loop

### Animation Engine
- **Interpolation Engine** with multiple easing functions:
  - Linear
  - Ease In / Ease Out / Ease In-Out
  - Bounce
  - Elastic
  - Back In / Back Out
  - Cubic Bezier support

### Built-in Presets
- Fade In / Fade Out
- Pop (with bounce)
- Bounce
- Slide Left / Right / Up / Down
- Typewriter
- Glitch
- Neon Flicker
- Shake
- Cinematic Reveal
- Smooth Zoom
- Subtitle Pop
- TikTok Caption Style
- RGB Split
- Blur Reveal

### Advanced Effects
- Text Shadow
- Glow
- Stroke
- Gradients (linear)
- Background Blur
- Glassmorphism
- 3D Transforms (rotateX, rotateY, perspective)
- Motion Blur simulation
- Animated gradients

### Export System
- **Export Project as JSON** — Save and share your projects
- **Import Project JSON** — Load saved projects
- **Export Animation as**:
  - GIF (frame-based)
  - WebM (video)
  - PNG Sequence (frame images)
- All exports are client-side — no server needed

### Typography Controls
- Custom fonts (Google Fonts loaded automatically)
- Font weight selection
- Line height
- Letter spacing
- Text alignment
- Vertical text mode
- Multiline support

### UI/UX
- Modern dark UI design
- Floating panels with dockable controls style
- Fully responsive (desktop & mobile)
- Touch support for mobile devices
- Keyboard shortcuts
- Professional motion graphics editor feel

### Performance
- GPU-accelerated animations via CSS transforms
- requestAnimationFrame render loop
- Optimized to avoid layout thrashing
- FPS monitor built-in
- Supports many animated layers smoothly

### Developer Quality
- Clean modular architecture
- Reusable ES6 classes
- Organized code sections
- Scalable design
- No deprecated APIs
- Memory leak prevention

### Extra Features
- **Undo/Redo System** — Full history management
- **Autosave** — Automatic saves to localStorage
- **Fullscreen Preview** — Distraction-free viewing
- **Zoomable Stage** — Zoom in/out for precision
- **FPS Monitor** — Real-time performance display
- **Preset Save/Load** — Built-in animation presets

## How to Use

### Getting Started
1. Open `index.html` in any modern browser
2. The default project loads with a sample text layer
3. Select the layer to edit its properties

### Adding Layers
- Click the **+** button in the Layers panel
- Or use the Add Layer button in the header

### Editing Text
1. Select a layer from the Layers panel
2. Edit text in the Properties panel on the right
3. Changes are reflected in real-time on the stage

### Animating with Keyframes
1. Select a layer
2. Move the playhead to the desired time
3. Adjust properties (position, scale, etc.)
4. Click the **Keyframe** button (star icon) or press **K**
5. Move the playhead to another time
6. Change properties again
7. Add another keyframe

### Applying Presets
1. Select a layer
2. Scroll to the **Animation Presets** section in Properties
3. Click any preset button to apply it at the current playhead position

### Playback
- **Space**: Play/Pause
- **S**: Stop
- **L**: Toggle Loop
- Drag the playhead to scrub through time

### Exporting
1. Click the **Export** button in the header
2. Choose export format:
   - **JSON**: Save your project
   - **WebM**: Export as video
   - **PNG Sequence**: Export frames as images
3. For WebM, a progress modal will show rendering status

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Space | Play / Pause |
| S | Stop |
| L | Toggle Loop |
| K | Add Keyframe |
| G | Toggle Grid |
| R | Toggle Rulers |
| F | Fullscreen |
| Delete / Backspace | Delete selected layer |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |

## GitHub Pages Deployment

### Method 1: Direct Upload
1. Create a new repository on GitHub
2. Upload these files:
   - `index.html`
   - `style.css`
   - `script.js`
3. Go to **Settings > Pages**
4. Select source: **Deploy from a branch**
5. Select branch: `main` / `master`
6. Your site will be live at `https://yourusername.github.io/reponame/`

### Method 2: Git Commands
```bash
# Create a new repository
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/text-motion-studio.git
git push -u origin main
```

Then enable GitHub Pages in repository settings.

### Method 3: GitHub Actions (Optional)
No build step needed! The app is pure HTML/CSS/JS and works directly.

## Architecture

### File Structure
```
text-motion-studio/
├── index.html      # Main HTML structure
├── style.css       # All styles and themes
├── script.js       # Application logic
└── README.md       # Documentation
```

### Class Architecture

```
TextMotionStudio (Main App)
├── StageManager        # Canvas/stage management
├── TimelineManager     # Timeline, playback, keyframes
├── PropertiesPanel     # Right panel property editors
├── ExportSystem        # JSON/GIF/WebM/PNG export
├── HistoryManager      # Undo/redo stack
├── AutosaveManager     # localStorage autosave
├── FPSMonitor          # Performance monitoring
└── TextLayer[]         # Layer data models

TextLayer
├── Transform properties (x, y, scale, rotation, opacity)
├── Typography properties (font, size, weight, etc.)
├── Effects (shadow, glow, stroke, gradient, etc.)
├── 3D properties (rotateX, rotateY, perspective)
├── Keyframes { property: [{time, value, easing}] }
└── Effects [{type, startTime, duration, ...}]
```

### Data Flow
1. User interacts with UI (drag, type, click)
2. State updates in TextLayer objects
3. StageManager renders DOM elements
4. TimelineManager handles playback and interpolation
5. HistoryManager saves states for undo/redo
6. AutosaveManager persists to localStorage

### Rendering Pipeline
1. `requestAnimationFrame` loop drives updates
2. At each frame, current time is evaluated
3. For each layer, keyframe interpolation calculates current values
4. CSS transforms are applied for GPU acceleration
5. Effects (glitch, shake, etc.) are applied per-frame

## Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Technical Notes

### No Build Tools
The entire application is written in vanilla JavaScript without any build step. Simply open `index.html` in a browser.

### No Backend
All functionality is client-side:
- Project data stored in memory and localStorage
- Exports generated using Canvas API and MediaRecorder
- No server communication required

### Performance Optimizations
- CSS `transform` and `opacity` for GPU compositing
- `will-change` hints for animated properties
- Debounced resize handlers
- Throttled mouse events
- Efficient keyframe lookup with binary search concept

### Memory Management
- Proper cleanup of DOM elements on layer deletion
- Event listener removal
- Canvas context cleanup
- History state size limiting

## License
MIT License — feel free to use, modify, and distribute.

## Credits
Built with pure HTML5, CSS3, and ES6+ JavaScript.
Fonts loaded from Google Fonts CDN.

---

**Text Motion Studio** — Create motion, in the browser.
