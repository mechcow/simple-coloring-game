class ColoringGame {
    constructor() {
        this.canvas = document.getElementById('coloringCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentColor = '#ff0000';
        this.currentTool = 'brush';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.brushSize = 5;
        this.currentTheme = 'fairy';
        
        // Color palette
        this.colorPalette = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', 
            '#00ffff', '#ff8800', '#8800ff', '#00ff88', '#ff0088'
        ];
        
        // Undo/Redo history
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50; // Limit history to prevent memory issues
        
        // Zoom functionality
        this.zoomLevel = 1;
        this.minZoom = 0.25;
        this.maxZoom = 4;
        this.zoomStep = 0.25;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        // Store loaded images
        this.loadedImages = {};
        
        this.themes = {
            fairy: {
                name: 'Fairy',
                imagePath: 'coloring-images/fairy.jpg',
                description: 'Magical fairy with wings and sparkles'
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
    
    init() {
        this.setupEventListeners();
        this.renderColorPalette();
        this.loadTheme(this.currentTheme);
        this.updateBlendedColor();
        this.updateUI();
        this.updateUndoRedoButtons(); // Initialize undo/redo button states
        
        // Fallback: hide loading overlay after 5 seconds if it's still visible
        setTimeout(() => {
            this.hideLoadingOverlay();
        }, 5000);
    }
    
    setupEventListeners() {
        // Color palette
        this.colorPalette.forEach((color, index) => {
            const swatch = document.querySelector(`[data-color="${color}"]`);
            if (swatch) {
                swatch.addEventListener('click', () => this.selectColor(color));
            }
        });

        // Color blender
        document.getElementById('color1').addEventListener('input', () => this.updateBlendedColor());
        document.getElementById('color2').addEventListener('input', () => this.updateBlendedColor());
        document.getElementById('blendRatio').addEventListener('input', () => this.updateBlendedColor());
        document.getElementById('addToPalette').addEventListener('click', () => this.addColorToPalette());

        // Theme selection
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.loadTheme(btn.dataset.theme));
        });

        // Tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTool(btn.dataset.tool));
        });

        // Brush size
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
        });

        // Actions
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveImage').addEventListener('click', () => this.saveImage());
        document.getElementById('printImage').addEventListener('click', () => this.printImage());
        
        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Panning events
        this.canvas.addEventListener('mousedown', (e) => this.startPanning(e));
        this.canvas.addEventListener('mousemove', (e) => this.pan(e));
        this.canvas.addEventListener('mouseup', () => this.stopPanning());
        this.canvas.addEventListener('mouseleave', () => this.stopPanning());
        
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            if (delta > 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
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
        if (this.themes[theme]) {
            this.currentTheme = theme;
            
            // Update active theme button
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });
            
            // Load image if not already loaded
            if (!this.loadedImages[theme]) {
                const img = new Image();
                img.onload = () => {
                    this.loadedImages[theme] = img;
                    this.redrawCanvas(true);
                    this.hideLoadingOverlay(); // Hide loading overlay when image loads
                };
                img.src = this.themes[theme].imagePath;
            } else {
                this.redrawCanvas(true);
                this.hideLoadingOverlay(); // Hide loading overlay when using cached image
            }
            
            console.log(`Theme loaded: ${theme}`);
        }
    }
    
    hideLoadingOverlay() {
        const overlay = document.querySelector('.canvas-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    drawThemeImage(theme, saveState = true) {
        const img = this.loadedImages[theme];
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
            
            console.log(`Image drawn: ${imgWidth}x${imgHeight} scaled to ${scaledWidth}x${scaledHeight} at (${x}, y)`);
            
            // Save the initial state for undo/redo only when called directly
            if (saveState) {
                this.saveCanvasState();
            }
        }
    }
    
    selectColor(color) {
        this.currentColor = color;
        
        // Update selected color swatch
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
        });
        document.querySelector(`[data-color="${color}"]`)?.classList.add('selected');
    }
    
    addColorToPalette() {
        const blendedColor = this.getBlendedColor();
        if (!this.colorPalette.includes(blendedColor)) {
            this.colorPalette.push(blendedColor);
            this.renderColorPalette();
            console.log('Color added to palette:', blendedColor);
        }
    }

    removeColorFromPalette(color) {
        const index = this.colorPalette.indexOf(color);
        if (index > -1) {
            this.colorPalette.splice(index, 1);
            this.renderColorPalette();
            
            // If the removed color was selected, select the first available color
            if (this.currentColor === color && this.colorPalette.length > 0) {
                this.selectColor(this.colorPalette[0]);
            }
        }
    }

    getBlendedColor() {
        const color1 = document.getElementById('color1').value;
        const color2 = document.getElementById('color2').value;
        const ratio = parseInt(document.getElementById('blendRatio').value) / 100;
        
        return this.blendColors(color1, color2, ratio);
    }

    updateBlendedColor() {
        const blendedColor = this.getBlendedColor();
        const display = document.getElementById('blendedColorDisplay');
        const blendValue = document.getElementById('blendValue');
        
        if (display) {
            display.style.backgroundColor = blendedColor;
        }
        
        if (blendValue) {
            blendValue.textContent = document.getElementById('blendRatio').value + '%';
        }
    }
    
    renderColorPalette() {
        const paletteContainer = document.querySelector('.color-palette');
        if (!paletteContainer) return;
        
        // Clear existing palette
        paletteContainer.innerHTML = '';
        
        // Create color swatches for each color in the palette
        this.colorPalette.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.title = color;
            
            // Add remove button for non-default colors
            if (index >= 10) { // First 10 are default colors
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
            
            swatch.addEventListener('click', () => this.selectColor(color));
            paletteContainer.appendChild(swatch);
        });
        
        // Update selected color display
        this.updateSelectedColorDisplay();
    }
    
    updateSelectedColorDisplay() {
        // Update the selected color indicator
        const selectedSwatch = document.querySelector('.color-swatch.selected');
        if (selectedSwatch) {
            selectedSwatch.classList.remove('selected');
        }
        
        const newSelectedSwatch = document.querySelector(`[data-color="${this.currentColor}"]`);
        if (newSelectedSwatch) {
            newSelectedSwatch.classList.add('selected');
        }
    }
    
    saveCanvasState() {
        // Save current canvas state to history
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new state to history
        this.history.push(imageData);
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
            this.restoreCanvasState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
            console.log(`Undo performed. History index: ${this.historyIndex}`);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreCanvasState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
            console.log(`Redo performed. History index: ${this.historyIndex}`);
        }
    }
    
    restoreCanvasState(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
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

    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoom();
    }

    updateZoom() {
        console.log('updateZoom called, zoom level:', this.zoomLevel, 'pan:', this.panX, this.panY);
        // Update zoom level display
        const zoomLevelElement = document.getElementById('zoomLevel');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = Math.round(this.zoomLevel * 100) + '%';
        }

        // Redraw the canvas with current zoom and pan
        this.redrawCanvas(false);
    }

    redrawCanvas(saveState = false) {
        console.log('redrawCanvas called, saveState:', saveState, 'zoom:', this.zoomLevel, 'pan:', this.panX, this.panY);
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply zoom transformation
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Redraw theme image
        this.drawThemeImage(this.currentTheme, saveState);
        
        // Redraw any user drawings from history
        if (this.history.length > 0 && this.historyIndex >= 0) {
            // We need to draw the history data without transformations
            // Create a temporary canvas to draw the history data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(this.history[this.historyIndex], 0, 0);
            
            // Draw the temp canvas onto the main canvas with transformations
            this.ctx.drawImage(tempCanvas, 0, 0);
        }
        
        this.ctx.restore();
        
        // Save state only if requested
        if (saveState) {
            this.saveCanvasState();
        }
    }

    // Pan functionality
    startPanning(e) {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    pan(e) {
        if (this.isPanning) {
            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            
            this.updateZoom();
        }
    }

    stopPanning() {
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
    }

    // Convert screen coordinates to canvas coordinates
    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.panX) / this.zoomLevel;
        const y = (screenY - rect.top - this.panY) / this.zoomLevel;
        return { x, y };
    }

    // Convert canvas coordinates to screen coordinates
    canvasToScreen(canvasX, canvasY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = rect.left + this.panX + (canvasX * this.zoomLevel);
        const y = rect.top + this.panY + (canvasY * this.zoomLevel);
        return { x, y };
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
    
    blendColors(color1, color2, ratio) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    startDrawing(e) {
        if (this.currentTool === 'fill') {
            const coords = this.screenToCanvas(e.clientX, e.clientY);
            console.log('Fill tool activated at:', coords.x, coords.y, 'with color:', this.currentColor);
            this.floodFill(coords.x, coords.y, this.currentColor);
            this.isDrawing = false; // Ensure fill tool doesn't leave drawing state active
            return; // Don't start drawing for fill tool
        }
        
        this.isDrawing = true;
        const coords = this.screenToCanvas(e.clientX, e.clientY);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const coords = this.screenToCanvas(e.clientX, e.clientY);
        const currentX = coords.x;
        const currentY = coords.y;
        
        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
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
            this.saveCanvasState();
        }
        
        this.isDrawing = false;
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    floodFill(startX, startY, fillColor) {
        console.log('Flood fill called with:', { startX, startY, fillColor });
        
        // Get the canvas image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        // Get the color at the starting point
        const startPos = (Math.floor(startY) * this.canvas.width + Math.floor(startX)) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];
        const startA = pixels[startPos + 3];
        
        console.log('Starting pixel color:', { startR, startG, startB, startA });
        
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
        
        // Use a more efficient flood fill algorithm with a queue
        const queue = [[Math.floor(startX), Math.floor(startY)]];
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let pixelsFilled = 0;
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            // Check bounds
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const pos = (y * width + x) * 4;
            
            // Check if this pixel matches the target color
            if (pixels[pos] !== startR || pixels[pos + 1] !== startG || 
                pixels[pos + 2] !== startB || pixels[pos + 3] !== startA) {
                continue;
            }
            
            // Fill this pixel
            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = 255; // Full opacity
            
            pixelsFilled++;
            
            // Add neighboring pixels to the queue
            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        console.log('Pixels filled:', pixelsFilled);
        
        // Put the modified image data back on the canvas
        this.ctx.putImageData(imageData, 0, 0);
        
        // Save canvas state after fill operation
        this.saveCanvasState();
    }
    
    clearCanvas() {
        // Clear the canvas and redraw the theme image with proper zoom/pan context
        this.redrawCanvas(true);
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
            brushSizeInput.value = this.brushSize;
        }
        
        // Update selected tool
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
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
    new ColoringGame();
}); 