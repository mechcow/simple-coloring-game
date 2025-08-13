class Paint {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.game = game;
        this.currentColor = '#FF0000';
        this.currentTool = 'brush';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.brushSize = 5;
    }

    startDrawing(e) {
        const eventCoords = this.game.getEventCoordinates(e);
        if (this.currentTool === 'fill') {
            // Debug coordinates for fill tool
            this.debugCoordinates(e, 'fill');
            
            // For mobile devices, use a shorter delay and ensure proper coordinate calculation
            const delay = e.touches ? 25 : 50; // Shorter delay for touch events
            setTimeout(() => {
                const coords = this.game.screenToCanvas(eventCoords.clientX, eventCoords.clientY);
                console.log('Fill tool activated at:', coords.x, coords.y, 'with color:', this.currentColor);
                this.game.floodFill(coords.x, coords.y, this.currentColor);
            }, delay);
            this.isDrawing = false; // Ensure fill tool doesn't leave drawing state active
            return; // Don't start drawing for fill tool
        }

        this.isDrawing = true;
        const coords = this.game.screenToCanvas(eventCoords.clientX, eventCoords.clientY);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    draw(e) {
        if (!this.isDrawing) return;

        const eventCoords = this.game.getEventCoordinates(e);
        const coords = this.game.screenToCanvas(eventCoords.clientX, eventCoords.clientY);
        const currentX = coords.x;
        const currentY = coords.y;

        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }

        // Debug coordinates for brush tool (only log occasionally to avoid spam)
        if (Math.random() < 0.1) { // Log 10% of the time
            this.debugCoordinates(e, 'brush');
        }

        console.log('Drawing with color:', this.currentColor, 'tool:', this.currentTool);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();

        this.lastX = currentX;
        this.lastY = currentY;
    }

    stopDrawing() {
        if (this.isDrawing) {
            // Save canvas state after drawing operation
            this.game.saveCanvasState();
        }

        this.isDrawing = false;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    selectColor(color) {
        console.log('selectColor called with color:', color);
        this.currentColor = color;

        // Update selected color swatch
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
        });
        const selectedSwatch = document.querySelector(`[data-color="${color}"]`);
        if (selectedSwatch) {
            selectedSwatch.classList.add('selected');
            console.log('Selected swatch updated:', selectedSwatch);
        } else {
            console.warn('Could not find swatch for color:', color);
        }
        
        console.log('Current color set to:', this.currentColor);
    }

    selectTool(tool) {
        this.currentTool = tool;

        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Update cursor
        if (tool === 'fill') {
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    // Debug method to help troubleshoot coordinate issues
    debugCoordinates(e, tool = 'unknown') {
        const eventCoords = this.game.getEventCoordinates(e);
        const canvasCoords = this.game.screenToCanvas(eventCoords.clientX, eventCoords.clientY);
        const rect = this.canvas.getBoundingClientRect();
        
        console.log(`Debug ${tool} coordinates:`, {
            event: e.type,
            screenX: eventCoords.clientX,
            screenY: eventCoords.clientY,
            rectLeft: rect.left,
            rectTop: rect.top,
            relativeX: eventCoords.clientX - rect.left,
            relativeY: eventCoords.clientY - rect.top,
            canvasScaleX: this.game.canvasScaleX,
            canvasScaleY: this.game.canvasScaleY,
            panX: this.game.panX,
            panY: this.game.panY,
            zoomLevel: this.game.zoomLevel,
            finalCanvasX: canvasCoords.x,
            finalCanvasY: canvasCoords.y,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            displayWidth: rect.width,
            displayHeight: rect.height
        });
        
        // Also log the reverse transformation to verify consistency
        const screenCoords = this.game.canvasToScreen(canvasCoords.x, canvasCoords.y);
        console.log(`${tool} tool - Reverse transformation verification:`, {
            canvas: { x: Math.round(canvasCoords.x), y: Math.round(canvasCoords.y) },
            backToScreen: { x: Math.round(screenCoords.x), y: Math.round(screenCoords.y) },
            original: { x: eventCoords.clientX, y: eventCoords.clientY },
            difference: { 
                x: Math.round(screenCoords.x - eventCoords.clientX), 
                y: Math.round(screenCoords.y - eventCoords.clientY) 
            }
        });
    }
}

class ColoringGame {
    constructor() {
        this.canvas = document.getElementById('coloringCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.paint = new Paint(this.canvas, this);
        this.currentTheme = 'fairy';

        // Color palette
        this.colorPalette = [
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00',
            '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF',
            '#FF00FF', '#FF0080', '#800000', '#808000', '#008000',
            '#000080', '#800080', '#000000', '#808080', '#FFFFFF'
        ];

        // Undo/Redo history
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50; // Limit history to prevent memory issues

        // Zoom functionality
        this.zoomLevel = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.zoomStep = 0.1; // Smaller step for smoother scrolling
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;

        // Store loaded images
        this.loadedImages = {};

        // Track current fairy selection
        this.currentFairySelection = 'fairy-1';

        // Canvas scaling information for mobile
        this.canvasScaleX = 1;
        this.canvasScaleY = 1;

        // Initialization flag for tests
        this.isInitialized = false;

        this.themes = {
            fairy: {
                name: 'Fairy',
                images: {
                    'fairy-1': {
                        path: 'coloring-images/fairy-1.jpg',
                        description: 'Magical fairy with wings and sparkles'
                    },
                    'fairy-2': {
                        path: 'coloring-images/fairy-2.jpg',
                        description: 'Another beautiful fairy design'
                    }
                },
                description: 'Choose your fairy design'
            },
            mermaid: {
                name: 'Mermaid',
                imagePath: 'coloring-images/mermaid.jpg',
                description: 'Beautiful mermaid in underwater scene'
            },
            princess: {
                name: 'Princess',
                imagePath: 'coloring-images/princess.jpg',
                description: 'Elegant princess in royal garden'
            },
            unicorn: {
                name: 'Unicorn',
                imagePath: 'coloring-images/unicorn.jpg',
                description: 'Magical unicorn with rainbow mane'
            },
            dessert: {
                name: 'Dessert',
                imagePath: 'coloring-images/dessert.jpg',
                description: 'Delicious cakes and sweet treats'
            }
        };

        this.init();
    }
    
    // Get the actual display dimensions of the canvas (accounting for CSS scaling)
    getCanvasDisplayDimensions() {
        const rect = this.canvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        return {
            width: rect.width,
            height: rect.height,
            scaleX: rect.width / this.canvas.width,
            scaleY: rect.height / this.canvas.height,
            devicePixelRatio: devicePixelRatio
        };
    }
    
    // Update canvas scaling information (call this when canvas size changes)
    updateCanvasScaling() {
        const displayDims = this.getCanvasDisplayDimensions();
        this.canvasScaleX = displayDims.scaleX;
        this.canvasScaleY = displayDims.scaleY;
        console.log('Canvas scaling updated:', {
            scaleX: this.canvasScaleX,
            scaleY: this.canvasScaleY,
            displayWidth: displayDims.width,
            displayHeight: displayDims.height,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            devicePixelRatio: displayDims.devicePixelRatio,
            userAgent: navigator.userAgent
        });
    }

    // Optimize canvas for high-DPI displays
    optimizeCanvasForHighDPI() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        if (devicePixelRatio > 1) {
            console.log('High-DPI display detected, device pixel ratio:', devicePixelRatio);

            // Get the canvas's CSS size
            const rect = this.canvas.getBoundingClientRect();
            const cssWidth = rect.width;
            const cssHeight = rect.height;

            // Set the canvas size to account for device pixel ratio
            this.canvas.width = cssWidth * devicePixelRatio;
            this.canvas.height = cssHeight * devicePixelRatio;

            // Scale the drawing context so everything draws at the correct size
            this.ctx.scale(devicePixelRatio, devicePixelRatio);

            // The canvas's CSS size is now controlled by the stylesheet.
            // We no longer set it here, allowing for responsive behavior.

            console.log('Canvas optimized for high-DPI:', {
                cssWidth,
                cssHeight,
                actualWidth: this.canvas.width,
                actualHeight: this.canvas.height,
                devicePixelRatio
            });
        }
    }

    getEventCoordinates(e) {
        let coords;
        if (e.touches && e.touches.length) {
            coords = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
            console.log('Touch event coordinates:', coords, 'event type:', e.type);
        } else {
            coords = { clientX: e.clientX, clientY: e.clientY };
            console.log('Mouse event coordinates:', coords, 'event type:', e.type);
        }
        return coords;
    }

    init() {
        this.setupEventListeners();
        this.renderColorPalette();
        this.loadTheme(this.currentTheme);
        this.updateUI();
        this.updateUndoRedoButtons(); // Initialize undo/redo button states
        
        // Defer canvas setup to avoid race conditions with CSS layout
        setTimeout(() => {
            this.updateCanvasScaling();
            this.optimizeCanvasForHighDPI();
            if (this.currentTheme === 'fairy') {
                this.loadFairyImage(this.currentFairySelection);
            }
        }, 100);

        // Fallback: hide loading overlay after 5 seconds if it's still visible
        setTimeout(() => {
            this.hideLoadingOverlay();
        }, 5000);

        // Mark as initialized for tests
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Color palette event listeners are now set up in renderColorPalette()

        // Color picker
        document.getElementById('customColor').addEventListener('input', () => this.updateCustomColor());
        document.getElementById('customColor').addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });
        document.getElementById('addToPalette').addEventListener('click', (e) => {
            e.preventDefault();
            this.addColorToPalette();
        });
        document.getElementById('addToPalette').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.addColorToPalette();
        }, { passive: false });

        // Set initial custom color value to match first palette color
        document.getElementById('customColor').value = this.colorPalette[0];

        // Theme selection
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadTheme(btn.dataset.theme);
            });
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.loadTheme(btn.dataset.theme);
            }, { passive: false });
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.loadTheme(btn.dataset.theme);
            });
        });

        // Tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.paint.selectTool(btn.dataset.tool);
            });
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.paint.selectTool(btn.dataset.tool);
            }, { passive: false });
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.paint.selectTool(btn.dataset.tool);
            });
        });

        // Brush size
        document.getElementById('brushSize').addEventListener('input', (e) => {
            e.preventDefault();
            this.paint.brushSize = parseInt(e.target.value);
            // Update the brush size display
            const sizeValue = document.getElementById('sizeValue');
            if (sizeValue) {
                sizeValue.textContent = this.paint.brushSize + 'px';
            }
        });
        document.getElementById('brushSize').addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Actions
        document.getElementById('clearCanvas').addEventListener('click', (e) => {
            e.preventDefault();
            this.clearCanvas();
        });
        document.getElementById('clearCanvas').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.clearCanvas();
        }, { passive: false });
        document.getElementById('saveImage').addEventListener('click', (e) => {
            e.preventDefault();
            this.saveImage();
        });
        document.getElementById('saveImage').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.saveImage();
        }, { passive: false });
        document.getElementById('printImage').addEventListener('click', (e) => {
            e.preventDefault();
            this.printImage();
        });
        document.getElementById('printImage').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.printImage();
        }, { passive: false });

        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.undo();
        });
        document.getElementById('undoBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.undo();
        }, { passive: false });
        document.getElementById('redoBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.redo();
        });
        document.getElementById('redoBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.redo();
        }, { passive: false });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', (e) => {
            e.preventDefault();
            this.zoomIn();
        });
        document.getElementById('zoomIn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.zoomIn();
        }, { passive: false });
        document.getElementById('zoomOut').addEventListener('click', (e) => {
            e.preventDefault();
            this.zoomOut();
        });
        document.getElementById('zoomOut').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.zoomOut();
        }, { passive: false });
        document.getElementById('resetZoom').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetZoom();
        });
        document.getElementById('resetZoom').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.resetZoom();
        }, { passive: false });

        // Canvas events - consolidated to handle both drawing and panning
        this.canvas.addEventListener('mousedown', (e) => {
            // Handle panning first
            if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
                this.startPanning(e);
            } else if (e.button === 0) { // Left click only
                this.paint.startDrawing(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.pan(e);
            } else if (this.paint.isDrawing) {
                this.paint.draw(e);
            }
            this.showPanCursor(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.stopPanning();
            } else if (this.paint.isDrawing) {
                this.paint.stopDrawing();
            }
        });

        this.canvas.addEventListener('mouseout', () => {
            if (this.isPanning) {
                this.stopPanning();
            } else if (this.paint.isDrawing) {
                this.paint.stopDrawing();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.stopPanning();
            } else if (this.paint.isDrawing) {
                this.paint.stopDrawing();
            }
        });

        // Touch events with improved mobile support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Handle single touch for drawing/filling
            if (e.touches.length === 1) {
                this.paint.startDrawing(e);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Only handle drawing if it's a single touch and we're drawing
            if (e.touches.length === 1 && this.paint.isDrawing) {
                this.paint.draw(e);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (this.paint.isDrawing) {
                this.paint.stopDrawing();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (this.paint.isDrawing) {
                this.paint.stopDrawing();
            }
        }, { passive: false });

        // Prevent context menu on long press (important for mobile)
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Mouse wheel zoom centered on mouse position
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            console.log('Wheel event triggered:', { 
                clientX: e.clientX, 
                clientY: e.clientY, 
                deltaY: e.deltaY,
                target: e.target,
                currentTarget: e.currentTarget,
                currentZoom: this.zoomLevel
            });
            
            // Use smaller zoom steps for scroll wheel for smoother experience
            const scrollZoomStep = 0.05; // Much smaller step for scroll wheel
            const delta = e.deltaY > 0 ? -scrollZoomStep : scrollZoomStep;

            console.log('Calculated delta:', delta, 'scrollZoomStep:', scrollZoomStep, 'deltaY:', e.deltaY);

            if (delta > 0) {
                console.log('Zooming in at point:', e.clientX, e.clientY);
                this.zoomInAtPoint(e.clientX, e.clientY, scrollZoomStep);
            } else {
                console.log('Zooming out at point:', e.clientX, e.clientY);
                this.zoomOutAtPoint(e.clientX, e.clientY, scrollZoomStep);
            }
            
            console.log('Zoom level after wheel event:', this.zoomLevel);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) { // Support both Ctrl (Windows/Linux) and Cmd (Mac)
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    this.resetZoom();
                }
            }
        });

        // Handle window resize and orientation changes (important for mobile)
        window.addEventListener('resize', () => {
            this.updateCanvasScaling();
            // Redraw canvas to ensure proper display after resize
            setTimeout(() => {
                this.redrawCanvas(false, false);
            }, 100);
        });

        // Handle orientation change specifically for mobile devices
        window.addEventListener('orientationchange', () => {
            // Wait for orientation change to complete
            setTimeout(() => {
                this.updateCanvasScaling();
                // Redraw canvas to ensure proper display after orientation change
                this.redrawCanvas(false, false);
            }, 300);
        });

        // Handle viewport changes (important for mobile browsers)
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                this.updateCanvasScaling();
                setTimeout(() => {
                    this.redrawCanvas(false, false);
                }, 100);
            });
        }
    }
    
    switchTheme(theme) {
        if (this.themes[theme]) {
            this.currentTheme = theme;
            this.loadTheme(theme);

            // Update active theme button
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
        }
    }

    loadTheme(theme) {
        console.log('loadTheme called with theme:', theme);
        if (this.themes[theme]) {
            this.currentTheme = theme;

            // Update active theme button
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });

            // Special handling for fairy theme - show selection UI
            if (theme === 'fairy') {
                console.log('Showing fairy selection UI');
                this.showFairySelection();
                return; // Don't load image yet, wait for fairy selection
            }

            // Clear history when switching themes to prevent old modifications from appearing
            this.clearHistory();

            // Load image if not already loaded
            if (!this.loadedImages[theme]) {
                console.log('Loading new image for theme:', theme);
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    console.log('Image loaded for theme:', theme);
                    this.loadedImages[theme] = img;
                    this.redrawCanvas(true, true);
                    this.hideLoadingOverlay(); // Hide loading overlay when image loads
                };
                img.src = this.themes[theme].imagePath;
            } else {
                console.log('Using cached image for theme:', theme);
                this.redrawCanvas(true, true);
                this.hideLoadingOverlay(); // Hide loading overlay when using cached image
            }

            console.log(`Theme loaded: ${theme}`);
        }
    }

    showFairySelection() {
        // Create fairy selection UI
        const fairySelection = document.createElement('div');
        fairySelection.className = 'fairy-selection';
        fairySelection.innerHTML = `
            <div class="fairy-selection-content">
                <h3>Choose Your Fairy Design</h3>
                <div class="fairy-options">
                    <div class="fairy-option" data-fairy="fairy-1">
                        <img src="coloring-images/fairy-1.jpg" alt="Fairy 1" width="150" height="150">
                        <p>Fairy 1</p>
                    </div>
                    <div class="fairy-option" data-fairy="fairy-2">
                        <img src="coloring-images/fairy-2.jpg" alt="Fairy 2" width="150" height="150">
                        <p>Fairy 2</p>
                    </div>
                </div>
                <button class="btn close-fairy-selection">Cancel</button>
            </div>
        `;

        // Add to canvas overlay
        const overlay = document.querySelector('.canvas-overlay');

        if (!overlay) {
            console.error('Canvas overlay not found!');
            return;
        }

        overlay.innerHTML = '';
        overlay.appendChild(fairySelection);
        overlay.style.display = 'block';

        // Add event listeners
        fairySelection.querySelectorAll('.fairy-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const fairyType = option.dataset.fairy;
                this.currentFairySelection = fairyType;
                this.loadFairyImage(fairyType);
                overlay.style.display = 'none';
            });
            option.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const fairyType = option.dataset.fairy;
                this.currentFairySelection = fairyType;
                this.loadFairyImage(fairyType);
                overlay.style.display = 'none';
            }, { passive: false });
        });

        fairySelection.querySelector('.close-fairy-selection').addEventListener('click', (e) => {
            e.preventDefault();
            overlay.style.display = 'none';
            // Reset to previous theme if available
            if (this.history.length > 0) {
                const lastState = this.history[this.historyIndex];
                if (lastState && lastState.theme && lastState.theme !== 'fairy') {
                    this.loadTheme(lastState.theme);
                }
            }
        });
        fairySelection.querySelector('.close-fairy-selection').addEventListener('touchstart', (e) => {
            e.preventDefault();
            overlay.style.display = 'none';
            // Reset to previous theme if available
            if (this.history.length > 0) {
                const lastState = this.history[this.historyIndex];
                if (lastState && lastState.theme && lastState.theme !== 'fairy') {
                    this.loadTheme(lastState.theme);
                }
            }
        }, { passive: false });
    }

    loadFairyImage(fairyType) {
        const fairyTheme = this.themes.fairy;
        const fairyImage = fairyTheme.images[fairyType];

        if (fairyImage) {
            // Clear history when selecting a fairy to prevent old modifications from appearing
            this.clearHistory();

            // Load the specific fairy image
            if (!this.loadedImages[fairyType]) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    this.loadedImages[fairyType] = img;
                    this.redrawCanvas(true, true);
                    this.hideLoadingOverlay();
                };
                img.src = fairyImage.path;
            } else {
                this.redrawCanvas(true, true);
                this.hideLoadingOverlay();
            }

            console.log(`Fairy image loaded: ${fairyType}`);
        }
    }
    
    hideLoadingOverlay() {
        const overlay = document.querySelector('.canvas-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    drawThemeImage(theme, saveState = true) {
        console.log('drawThemeImage called with theme:', theme, 'saveState:', saveState);
        let img;
        let imgPath;

        if (theme === 'fairy') {
            // For fairy theme, use the selected fairy image
            img = this.loadedImages[this.currentFairySelection];
            imgPath = this.themes.fairy.images[this.currentFairySelection].path;
            console.log('Using fairy image:', this.currentFairySelection, 'path:', imgPath);
        } else {
            // For other themes, use the theme's image
            img = this.loadedImages[theme];
            imgPath = this.themes[theme].imagePath;
            console.log('Using theme image:', theme, 'path:', imgPath);
        }
        
        if (img && img.complete) {
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;

            // Calculate scaling to fit canvas while preserving aspect ratio
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;

            const scaleX = canvasWidth / imgWidth;
            const scaleY = canvasHeight / imgHeight;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;

            // Center the image
            const x = (canvasWidth - scaledWidth) / 2;
            const y = (canvasHeight - scaledHeight) / 2;

            // Draw the image (zoom context is already applied by caller)
            this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            console.log(`Image drawn: ${imgWidth}x${imgHeight} scaled to ${scaledWidth}x${scaledHeight} at (${x}, ${y})`);

            // Save the initial state for undo/redo only when called directly
            if (saveState) {
                console.log('Saving canvas state after drawing theme image');
                this.saveCanvasState();
            }
        } else {
            console.log('Image not ready:', img, 'complete:', img ? img.complete : 'no image');
        }
    }

    addColorToPalette() {
        const customColor = document.getElementById('customColor').value;
        if (!this.colorPalette.includes(customColor)) {
            this.colorPalette.push(customColor);
            this.renderColorPalette();
            console.log('Color added to palette:', customColor);
        }
    }

    removeColorFromPalette(color) {
        const index = this.colorPalette.indexOf(color);
        if (index > -1) {
            this.colorPalette.splice(index, 1);
            this.renderColorPalette();

            // If the removed color was selected, select the first available color
            if (this.paint.currentColor === color && this.colorPalette.length > 0) {
                this.paint.selectColor(this.colorPalette[0]);
            }
        }
    }

    updateCustomColor() {
        const customColor = document.getElementById('customColor').value;
        // You can add visual feedback here if needed
        console.log('Custom color selected:', customColor);
    }
    
    renderColorPalette() {
        const paletteContainer = document.querySelector('.color-palette');
        if (!paletteContainer) return;

        // Clear existing content but preserve the heading
        const heading = paletteContainer.querySelector('h3');
        paletteContainer.innerHTML = '';

        // Restore the heading
        if (heading) {
            paletteContainer.appendChild(heading);
        } else {
            // Create heading if it doesn't exist
            const newHeading = document.createElement('h3');
            newHeading.textContent = 'Color Palette';
            paletteContainer.appendChild(newHeading);
        }

        // Create the basic-colors container
        const basicColorsContainer = document.createElement('div');
        basicColorsContainer.className = 'basic-colors';

        // Create color swatches for each color in the palette
        this.colorPalette.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.title = color;

            // Add remove button for non-default colors
            if (index >= 20) { // First 20 are default colors
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-color';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove color';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeColorFromPalette(color);
                });
                swatch.appendChild(removeBtn);
            }

            // Add both click and touch events for better mobile support
            swatch.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Color swatch clicked:', color);
                this.paint.selectColor(color);
            });

            // Touch events for mobile
            swatch.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('Color swatch touched:', color);
                this.paint.selectColor(color);
            }, { passive: false });

            // Add pointer events for better cross-device support
            swatch.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                console.log('Color swatch pointer down:', color);
                this.paint.selectColor(color);
            });

            basicColorsContainer.appendChild(swatch);
        });

        // Add the basic-colors container to the palette
        paletteContainer.appendChild(basicColorsContainer);

        // Update selected color display
        this.updateSelectedColorDisplay();
    }

    updateSelectedColorDisplay() {
        // Update the selected color indicator
        const selectedSwatch = document.querySelector('.color-swatch.selected');
        if (selectedSwatch) {
            selectedSwatch.classList.remove('selected');
        }

        const newSelectedSwatch = document.querySelector(`[data-color="${this.paint.currentColor}"]`);
        if (newSelectedSwatch) {
            newSelectedSwatch.classList.add('selected');
        }
    }

    saveCanvasState() {
        // Save current canvas state to history
        // We need to get the image data from an untransformed canvas context
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the current canvas state onto the temp canvas
        tempCtx.drawImage(this.canvas, 0, 0);

        // Get the image data from the temp canvas (untransformed)
        const imageData = tempCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Create a state object that includes canvas data and theme info
        const state = {
            imageData: imageData,
            theme: this.currentTheme,
            fairySelection: this.currentFairySelection,
            zoom: this.zoomLevel,
            panX: this.panX,
            panY: this.panY
        };

        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new state to history
        this.history.push(state);
        this.historyIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }

        this.updateUndoRedoButtons();
        console.log(`Canvas state saved. History: ${this.history.length} states, Index: ${this.historyIndex}`);
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.restoreCanvasState(state);

            // Restore theme and fairy selection if they changed
            if (state.theme !== this.currentTheme) {
                this.currentTheme = state.theme;
                // Update active theme button
                document.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.theme === state.theme);
                });
            }

            if (state.fairySelection !== this.currentFairySelection) {
                this.currentFairySelection = state.fairySelection;
            }

            this.updateUndoRedoButtons();
            console.log(`Undo performed. History index: ${this.historyIndex}`);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.restoreCanvasState(state);

            // Restore theme and fairy selection if they changed
            if (state.theme !== this.currentTheme) {
                this.currentTheme = state.theme;
                // Update active theme button
                document.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.theme === state.theme);
                });
            }

            if (state.fairySelection !== this.currentFairySelection) {
                this.currentFairySelection = state.fairySelection;
            }

            this.updateUndoRedoButtons();
            console.log(`Redo performed. History index: ${this.historyIndex}`);
        }
    }

    restoreCanvasState(state) {
        // Store the current zoom and pan settings
        const currentZoom = this.zoomLevel;
        const currentPanX = this.panX;
        const currentPanY = this.panY;

        // Temporarily reset zoom and pan to restore the state
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;

        // Restore the image data without transformations
        this.ctx.putImageData(state.imageData, 0, 0);

        // Restore the zoom and pan settings
        this.zoomLevel = currentZoom;
        this.panX = currentPanX;
        this.panY = currentPanY;

        // Redraw the canvas with the restored state and current transformations
        this.redrawCanvas(false, false);

        console.log(`Canvas state restored. Zoom: ${this.zoomLevel}, Pan: (${this.panX}, ${this.panY})`);
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
            undoBtn.classList.toggle('disabled', this.historyIndex <= 0);
        }

        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
            redoBtn.classList.toggle('disabled', this.historyIndex >= this.history.length - 1);
        }
    }
    
    clearHistory() {
        // Clear the history when switching themes
        this.history = [];
        this.historyIndex = -1;
        this.updateUndoRedoButtons();
        console.log('History cleared for new theme');
    }

    // Zoom functionality
    zoomIn() {
        console.log('zoomIn called, current zoom:', this.zoomLevel);
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
            console.log('new zoom level:', this.zoomLevel);
            this.updateZoom();
        }
    }

    zoomOut() {
        console.log('zoomOut called, current zoom:', this.zoomLevel);
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
            console.log('new zoom level:', this.zoomLevel);
            this.updateZoom();
        }
    }

    zoomInAtPoint(screenX, screenY, customStep = null) {
        console.log('zoomInAtPoint called at:', screenX, screenY, 'current zoom:', this.zoomLevel);
        const step = customStep || this.zoomStep;
        console.log('zoomInAtPoint - step:', step, 'minZoom:', this.minZoom, 'maxZoom:', this.maxZoom);
        
        if (this.zoomLevel < this.maxZoom) {
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + step);
            console.log('zoomInAtPoint - oldZoom:', oldZoom, 'new zoomLevel:', this.zoomLevel);

            // Adjust pan to keep the point under mouse cursor
            this.adjustPanForZoom(screenX, screenY, oldZoom, this.zoomLevel);
            this.updateZoom();
        } else {
            console.log('zoomInAtPoint - zoom level already at max:', this.zoomLevel);
        }
    }

    zoomOutAtPoint(screenX, screenY, customStep = null) {
        console.log('zoomOutAtPoint called at:', screenX, screenY, 'current zoom:', this.zoomLevel);
        const step = customStep || this.zoomStep;
        if (this.zoomLevel > this.minZoom) {
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - step);

            // Adjust pan to keep the point under mouse cursor
            this.adjustPanForZoom(screenX, screenY, oldZoom, this.zoomLevel);
            this.updateZoom();
        }
    }

    adjustPanForZoom(screenX, screenY, oldZoom, newZoom) {
        console.log('adjustPanForZoom called - screen:', screenX, screenY, 'oldZoom:', oldZoom, 'newZoom:', newZoom, 'old pan:', this.panX, this.panY);

        const rect = this.canvas.getBoundingClientRect();

        // Fix: Proper coordinate transformation for zoom centering
        // Get the position relative to the canvas element
        const relativeX = screenX - rect.left;
        const relativeY = screenY - rect.top;

        // Account for canvas CSS scaling (important for mobile)
        const scaledX = relativeX / this.canvasScaleX;
        const scaledY = relativeY / this.canvasScaleY;

        // Get the point in canvas coordinates before zoom
        const canvasX = (scaledX - this.panX) / oldZoom;
        const canvasY = (scaledY - this.panY) / oldZoom;

        // Calculate where this point should be after zoom to keep it under the cursor
        const newPanX = scaledX - (canvasX * newZoom);
        const newPanY = scaledY - (canvasY * newZoom);

        console.log('adjustPanForZoom - relative:', relativeX, relativeY, 'scaled:', scaledX, scaledY, 'canvas:', canvasX, canvasY, 'new pan:', newPanX, newPanY);

        this.panX = newPanX;
        this.panY = newPanY;
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoom();
    }

    updateZoom() {
        console.log('updateZoom called, zoom level:', this.zoomLevel, 'pan:', this.panX, this.panY);

        // Ensure zoom level is within bounds
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel));
        console.log('updateZoom - oldZoom:', oldZoom, 'new zoomLevel after bounds check:', this.zoomLevel);

        // Update canvas scaling information
        this.updateCanvasScaling();

        // Update zoom level display
        const zoomLevelElement = document.getElementById('zoomLevel');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = Math.round(this.zoomLevel * 100) + '%';
            console.log('Updated zoom display to:', zoomLevelElement.textContent);
        } else {
            console.log('Zoom level element not found!');
        }

        // Redraw the canvas with current zoom and pan, but don't redraw the theme image
        console.log('Calling redrawCanvas from updateZoom');
        this.redrawCanvas(false, false);
    }

    redrawCanvas(saveState = false, redrawTheme = true) {
        console.log('redrawCanvas called, saveState:', saveState, 'redrawTheme:', redrawTheme, 'zoom:', this.zoomLevel, 'pan:', this.panX, this.panY);

        // Update canvas scaling information before redrawing
        this.updateCanvasScaling();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply simple zoom and pan transformations
        this.ctx.save();

        // Apply transformations in simple order: pan first, then zoom
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Only redraw theme image if requested (not needed when just redrawing user modifications)
        if (redrawTheme) {
            console.log('Redrawing theme image');
            this.drawThemeImage(this.currentTheme, false);
        }

        // Redraw any user drawings from history
        if (this.history.length > 0 && this.historyIndex >= 0) {
            const historyState = this.history[this.historyIndex];
            if (historyState && historyState.imageData) {
                console.log('Redrawing history state, index:', this.historyIndex);
                // Create a temporary canvas to draw the history data
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvas.width;
                tempCanvas.height = this.canvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the history image data onto the temp canvas
                tempCtx.putImageData(historyState.imageData, 0, 0);

                // Draw the temp canvas onto the main canvas with transformations
                this.ctx.drawImage(tempCanvas, 0, 0);
            } else {
                console.log('No valid history state found');
            }
        } else {
            console.log('No history to redraw, length:', this.history.length, 'index:', this.historyIndex);
        }

        this.ctx.restore();
        
        // Save state only if requested
        if (saveState) {
            console.log('Saving canvas state');
            this.saveCanvasState();
        }
    }

    // Pan functionality
    startPanning(e) {
        this.isPanning = true;
        const eventCoords = this.getEventCoordinates(e);
        this.lastPanX = eventCoords.clientX;
        this.lastPanY = eventCoords.clientY;
        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }

    // Show pan cursor when Alt is held down
    showPanCursor(e) {
        if (e.altKey) {
            this.canvas.style.cursor = 'grab';
        } else if (!this.isPanning) {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    pan(e) {
        if (this.isPanning) {
            const eventCoords = this.getEventCoordinates(e);
            const deltaX = eventCoords.clientX - this.lastPanX;
            const deltaY = eventCoords.clientY - this.lastPanY;

            // Only update if there's meaningful movement (prevents excessive redraws)
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                console.log('Panning - deltaX:', deltaX, 'deltaY:', deltaY, 'old pan:', this.panX, this.panY);

                // Account for CSS scaling when panning (important for mobile)
                this.panX += deltaX / this.canvasScaleX;
                this.panY += deltaY / this.canvasScaleY;

                console.log('New pan position:', this.panX, this.panY, 'canvasScale:', this.canvasScaleX, this.canvasScaleY);

                this.lastPanX = eventCoords.clientX;
                this.lastPanY = eventCoords.clientY;

                // Update zoom display and redraw
                this.updateZoom();
            }
        }
    }

    stopPanning() {
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
    }

    // Convert screen coordinates to canvas coordinates
    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();

        // Get the position relative to the canvas element
        const relativeX = screenX - rect.left;
        const relativeY = screenY - rect.top;

        // Account for canvas CSS scaling (important for mobile)
        const scaledX = relativeX / this.canvasScaleX;
        const scaledY = relativeY / this.canvasScaleY;

        // Then, account for pan and zoom transformations
        const x = (scaledX - this.panX) / this.zoomLevel;
        const y = (scaledY - this.panY) / this.zoomLevel;

        console.log('screenToCanvas:', {
            screenX,
            screenY,
            rectLeft: rect.left,
            rectTop: rect.top,
            relativeX,
            relativeY,
            canvasScaleX: this.canvasScaleX,
            canvasScaleY: this.canvasScaleY,
            scaledX,
            scaledY,
            panX: this.panX,
            panY: this.panY,
            zoomLevel: this.zoomLevel,
            resultX: x,
            resultY: y
        });

        return { x, y };
    }

    // Convert canvas coordinates to screen coordinates
    canvasToScreen(canvasX, canvasY) {
        const rect = this.canvas.getBoundingClientRect();

        // Apply zoom first, then pan, then scale to display size, then add canvas offset
        const scaledX = (canvasX * this.zoomLevel + this.panX) * this.canvasScaleX + rect.left;
        const scaledY = (canvasY * this.zoomLevel + this.panY) * this.canvasScaleY + rect.top;

        return { x: scaledX, y: scaledY };
    }

    floodFill(startX, startY, fillColor) {
        console.log('Flood fill called with:', { startX, startY, fillColor });
        console.log('Current paint color:', this.paint.currentColor);

        // startX and startY are already canvas coordinates from screenToCanvas
        const actualX = Math.floor(startX);
        const actualY = Math.floor(startY);

        console.log('Using canvas coordinates:', { actualX, actualY });
        console.log('Canvas dimensions:', { width: this.canvas.width, height: this.canvas.height });

        // Check bounds
        if (actualX < 0 || actualX >= this.canvas.width || actualY < 0 || actualY >= this.canvas.height) {
            console.error('Coordinates out of bounds:', { actualX, actualY, width: this.canvas.width, height: this.canvas.height });
            return;
        }

        // Create a temporary canvas to work with untransformed coordinates
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the current canvas state onto the temp canvas
        // This gives us the untransformed image data to work with
        tempCtx.drawImage(this.canvas, 0, 0);

        // Get the image data from the temp canvas (untransformed)
        const imageData = tempCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;

        // Get the color at the starting point
        const startPos = (actualY * this.canvas.width + actualX) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];
        const startA = pixels[startPos + 3];

        console.log('Starting pixel color:', { startR, startG, startB, startA });
        console.log('Starting pixel position in array:', startPos);

        // Parse the fill color
        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);

        console.log('Fill color:', { fillR, fillG, fillB });

        // Don't fill if we're trying to fill with the same color
        if (startR === fillR && startG === fillG && startB === fillB) {
            console.log('Same color, no fill needed');
            return; // Already the same color
        }

        // Define color tolerance for more robust filling
        // This allows filling to get very close to lines without leaving gaps
        const tolerance = 35; // Adjust this value if needed

        // Helper function to check if colors are similar enough to fill
        const isSimilarColor = (r1, g1, b1, a1, r2, g2, b2, a2) => {
            const colorDiff = Math.sqrt(
                Math.pow(r1 - r2, 2) +
                Math.pow(g1 - g2, 2) +
                Math.pow(b1 - b2, 2)
            );
            return colorDiff <= tolerance;
        };

        // Use a more efficient flood fill algorithm with a queue
        const queue = [[actualX, actualY]];
        const width = this.canvas.width;
        const height = this.canvas.height;
        const visited = new Set(); // Track visited pixels to avoid infinite loops

        let pixelsFilled = 0;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;

            // Check bounds and if already visited
            if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) continue;
            
            visited.add(key);
            const pos = (y * width + x) * 4;

            // Check if this pixel matches the target color (with tolerance)
            if (!isSimilarColor(pixels[pos], pixels[pos + 1], pixels[pos + 2], pixels[pos + 3],
                               startR, startG, startB, startA)) {
                continue;
            }

            // Fill this pixel
            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = 255; // Full opacity

            pixelsFilled++;

            // Add neighboring pixels to the queue (8-directional for better coverage)
            queue.push(
                [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
                [x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1]
            );
        }

        console.log('Pixels filled:', pixelsFilled);

        if (pixelsFilled > 0) {
            console.log('Creating new history state with filled image data');

            // Put the modified image data back onto the temp canvas
            tempCtx.putImageData(imageData, 0, 0);

            // Create a new history state with the filled image data
            const newState = {
                imageData: tempCtx.getImageData(0, 0, this.canvas.width, this.canvas.height),
                theme: this.currentTheme,
                fairySelection: this.currentFairySelection,
                zoom: this.zoomLevel,
                panX: this.panX,
                panY: this.panY
            };

            // Add this state to history
            this.historyIndex++;
            this.history.splice(this.historyIndex, this.history.length); // Remove any future states
            this.history.push(newState);

            // Limit history size
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
                this.historyIndex--;
            }

            console.log('History updated, current index:', this.historyIndex, 'history length:', this.history.length);

            // Redraw the canvas with the new state, but ensure theme is redrawn
            this.redrawCanvas(false, true);

            // Update undo/redo buttons
            this.updateUndoRedoButtons();
        } else {
            console.log('No pixels were filled');
        }
    }

    clearCanvas() {
        // Clear the canvas and redraw the theme image with proper zoom/pan context
        this.clearHistory();
        this.redrawCanvas(true, true);
    }

    saveImage() {
        // Create a temporary canvas to capture the current view
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Draw the current canvas state
        tempCtx.drawImage(this.canvas, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = `coloring-${this.currentTheme}-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    }

    printImage() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Coloring</title>
                    <style>
                        body { margin: 0; padding: 20px; text-align: center; }
                        img { max-width: 100%; height: auto; }
                        h1 { color: #333; font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>
                    <h1>My Coloring: ${this.currentTheme}</h1>
                    <img src="${this.canvas.toDataURL()}" alt="Coloring">
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    updateUI() {
        // Update brush size display
        const brushSizeInput = document.getElementById('brushSize');
        if (brushSizeInput) {
            brushSizeInput.value = this.paint.brushSize;
        }

        // Update selected tool
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.paint.currentTool);
        });

        // Update selected theme
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });

        // Update selected color
        this.updateSelectedColorDisplay();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new ColoringGame();
}); 