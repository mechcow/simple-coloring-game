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
        this.colorPalette = ['#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080', '#800000', '#808000', '#008000', '#000080', '#800080', '#000000', '#808080', '#FFFFFF'];
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.zoomLevel = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.zoomStep = 0.1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.loadedImages = {};
        this.currentFairySelection = 'fairy-1';
        this.canvasScaleX = 1;
        this.canvasScaleY = 1;
        this.themes = {
            fairy: { name: 'Fairy', images: { 'fairy-1': { path: 'coloring-images/fairy-1.jpg' }, 'fairy-2': { path: 'coloring-images/fairy-2.jpg' } } },
            mermaid: { name: 'Mermaid', imagePath: 'coloring-images/mermaid.jpg' },
            princess: { name: 'Princess', imagePath: 'coloring-images/princess.jpg' },
            unicorn: { name: 'Unicorn', imagePath: 'coloring-images/unicorn.jpg' },
            dessert: { name: 'Dessert', imagePath: 'coloring-images/dessert.jpg' }
        };
        this.init();
    }

    handleResize() {
        setTimeout(() => {
            this.optimizeCanvasForHighDPI();
            this.updateCanvasScaling();
            this.redrawCanvas(false, true);
        }, 150);
    }
    
    optimizeCanvasForHighDPI() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * devicePixelRatio;
        this.canvas.height = rect.height * devicePixelRatio;

        this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    updateCanvasScaling() {
        const displayDims = this.getCanvasDisplayDimensions();
        this.canvasScaleX = displayDims.scaleX;
        this.canvasScaleY = displayDims.scaleY;
    }

    getCanvasDisplayDimensions() {
        const rect = this.canvas.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            scaleX: rect.width / this.canvas.width,
            scaleY: rect.height / this.canvas.height
        };
    }

    init() {
        this.setupEventListeners();
        this.renderColorPalette();
        this.loadTheme(this.currentTheme);
        this.updateUI();
        this.updateUndoRedoButtons();
        
        // Defer initial sizing to allow CSS to apply
        this.handleResize();
    }

    setupEventListeners() {
        document.getElementById('customColor').addEventListener('input', () => this.updateCustomColor());
        document.getElementById('addToPalette').addEventListener('click', () => this.addColorToPalette());
        document.querySelectorAll('.theme-btn').forEach(btn => btn.addEventListener('click', () => this.loadTheme(btn.dataset.theme)));
        document.querySelectorAll('.tool-btn').forEach(btn => btn.addEventListener('click', () => this.paint.selectTool(btn.dataset.tool)));
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.paint.brushSize = parseInt(e.target.value);
            document.getElementById('sizeValue').textContent = this.paint.brushSize + 'px';
        });
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveImage').addEventListener('click', () => this.saveImage());
        document.getElementById('printImage').addEventListener('click', () => this.printImage());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoom').addEventListener('click', () => this.resetZoom());

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.altKey)) this.startPanning(e);
            else if (e.button === 0) this.paint.startDrawing(e);
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) this.pan(e);
            else if (this.paint.isDrawing) this.paint.draw(e);
        });
        this.canvas.addEventListener('mouseup', () => {
            if (this.isPanning) this.stopPanning();
            else if (this.paint.isDrawing) this.paint.stopDrawing();
        });
        this.canvas.addEventListener('mouseout', () => {
            if (this.isPanning) this.stopPanning();
            else if (this.paint.isDrawing) this.paint.stopDrawing();
        });
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (e.touches.length === 1) this.paint.startDrawing(e); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches.length === 1 && this.paint.isDrawing) this.paint.draw(e); }, { passive: false });
        this.canvas.addEventListener('touchend', () => { if (this.paint.isDrawing) this.paint.stopDrawing(); });
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            if (delta > 0) this.zoomInAtPoint(e.clientX, e.clientY, 0.05);
            else this.zoomOutAtPoint(e.clientX, e.clientY, 0.05);
        });

        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => this.handleResize());
    }
    
    getEventCoordinates(e) {
        return e.touches && e.touches.length ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
    }

    loadTheme(theme) {
        if (this.themes[theme]) {
            this.currentTheme = theme;
            document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
            if (theme === 'fairy') {
                this.showFairySelection();
                return;
            }
            this.loadImage(this.themes[theme].imagePath);
        }
    }

    loadImage(path) {
        if (!this.loadedImages[path]) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                this.loadedImages[path] = img;
                this.clearHistory();
                this.redrawCanvas(true, true);
                this.hideLoadingOverlay();
            };
            img.src = path;
        } else {
            this.clearHistory();
            this.redrawCanvas(true, true);
            this.hideLoadingOverlay();
        }
    }

    showFairySelection() {
        const overlay = document.querySelector('.canvas-overlay');
        overlay.innerHTML = `<div class="fairy-selection-content"><h3>Choose Your Fairy Design</h3><div class="fairy-options"><div class="fairy-option" data-fairy="fairy-1"><img src="coloring-images/fairy-1.jpg" alt="Fairy 1"><p>Fairy 1</p></div><div class="fairy-option" data-fairy="fairy-2"><img src="coloring-images/fairy-2.jpg" alt="Fairy 2"><p>Fairy 2</p></div></div><button class="btn close-fairy-selection">Cancel</button></div>`;
        overlay.style.display = 'block';
        overlay.querySelectorAll('.fairy-option').forEach(option => {
            option.addEventListener('click', () => {
                this.currentFairySelection = option.dataset.fairy;
                this.loadImage(this.themes.fairy.images[this.currentFairySelection].path);
                overlay.style.display = 'none';
            });
        });
        overlay.querySelector('.close-fairy-selection').addEventListener('click', () => overlay.style.display = 'none');
    }

    loadFairyImage(fairyType) {
        this.loadImage(this.themes.fairy.images[fairyType].path);
    }
    
    hideLoadingOverlay() {
        const overlay = document.querySelector('.canvas-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    drawThemeImage(theme, saveState = true) {
        let img;
        if (theme === 'fairy') {
            img = this.loadedImages[this.themes.fairy.images[this.currentFairySelection].path];
        } else {
            img = this.loadedImages[this.themes[theme].imagePath];
        }
        
        if (img && img.complete) {
            const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
            const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
            const scale = Math.min(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight);
            const scaledWidth = img.naturalWidth * scale;
            const scaledHeight = img.naturalHeight * scale;
            const x = (canvasWidth - scaledWidth) / 2;
            const y = (canvasHeight - scaledHeight) / 2;
            this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            if (saveState) this.saveCanvasState();
        }
    }
    
    renderColorPalette() {
        const paletteContainer = document.querySelector('.basic-colors');
        paletteContainer.innerHTML = '';
        this.colorPalette.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => this.paint.selectColor(color));
            paletteContainer.appendChild(swatch);
        });
    }

    saveCanvasState() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        const state = { imageData, zoom: this.zoomLevel, panX: this.panX, panY: this.panY };
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        this.updateUndoRedoButtons();
    }

    restoreCanvasState(state) {
        this.zoomLevel = state.zoom;
        this.panX = state.panX;
        this.panY = state.panY;
        this.redrawCanvas(false, true);
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreCanvasState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreCanvasState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }
    
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.updateUndoRedoButtons();
    }

    zoomIn() { this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep); this.updateZoom(); }
    zoomOut() { this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep); this.updateZoom(); }
    resetZoom() { this.zoomLevel = 1; this.panX = 0; this.panY = 0; this.updateZoom(); }

    zoomInAtPoint(screenX, screenY, step) {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + step);
        this.adjustPanForZoom(screenX, screenY, oldZoom, this.zoomLevel);
        this.updateZoom();
    }

    zoomOutAtPoint(screenX, screenY, step) {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - step);
        this.adjustPanForZoom(screenX, screenY, oldZoom, this.zoomLevel);
        this.updateZoom();
    }

    adjustPanForZoom(screenX, screenY, oldZoom, newZoom) {
        const rect = this.canvas.getBoundingClientRect();
        const scaledX = (screenX - rect.left) / this.canvasScaleX;
        const scaledY = (screenY - rect.top) / this.canvasScaleY;
        const canvasX = (scaledX - this.panX) / oldZoom;
        const canvasY = (scaledY - this.panY) / oldZoom;
        this.panX = scaledX - (canvasX * newZoom);
        this.panY = scaledY - (canvasY * newZoom);
    }

    updateZoom() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
        this.redrawCanvas(false, false);
    }

    redrawCanvas(saveState = false, redrawTheme = true) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        const lastState = this.history[this.historyIndex];
        if (lastState && lastState.imageData) {
            this.ctx.putImageData(lastState.imageData, 0, 0);
        } else if (redrawTheme) {
            this.drawThemeImage(this.currentTheme, false);
        }
        this.ctx.restore();
        
        if (saveState) this.saveCanvasState();
    }

    startPanning(e) {
        this.isPanning = true;
        const eventCoords = this.getEventCoordinates(e);
        this.lastPanX = eventCoords.clientX;
        this.lastPanY = eventCoords.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    pan(e) {
        if (!this.isPanning) return;
        const eventCoords = this.getEventCoordinates(e);
        const deltaX = eventCoords.clientX - this.lastPanX;
        const deltaY = eventCoords.clientY - this.lastPanY;
        this.panX += deltaX / this.canvasScaleX;
        this.panY += deltaY / this.canvasScaleY;
        this.lastPanX = eventCoords.clientX;
        this.lastPanY = eventCoords.clientY;
        this.updateZoom();
    }

    stopPanning() {
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
    }

    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaledX = (screenX - rect.left) / this.canvasScaleX;
        const scaledY = (screenY - rect.top) / this.canvasScaleY;
        const x = (scaledX - this.panX) / this.zoomLevel;
        const y = (scaledY - this.panY) / this.zoomLevel;
        return { x, y };
    }

    floodFill(startX, startY, fillColor) {
        const actualX = Math.floor(startX);
        const actualY = Math.floor(startY);
        const lastState = this.history[this.historyIndex];
        if (!lastState) return;

        const imageData = new ImageData(new Uint8ClampedArray(lastState.imageData.data), lastState.imageData.width, lastState.imageData.height);
        const pixels = imageData.data;
        const width = imageData.width;
        const startPos = (actualY * width + actualX) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];
        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);

        if (startR === fillR && startG === fillG && startB === fillB) return;

        const tolerance = 35;
        const isSimilarColor = (r1, g1, b1, r2, g2, b2) => Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)) <= tolerance;

        const queue = [[actualX, actualY]];
        const visited = new Set();
        let pixelsFilled = 0;

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;
            if (x < 0 || x >= width || y < 0 || y >= imageData.height || visited.has(key)) continue;
            
            visited.add(key);
            const pos = (y * width + x) * 4;

            if (!isSimilarColor(pixels[pos], pixels[pos + 1], pixels[pos + 2], startR, startG, startB)) continue;

            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = 255;
            pixelsFilled++;
            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        if (pixelsFilled > 0) {
            const newState = { imageData, zoom: this.zoomLevel, panX: this.panX, panY: this.panY, theme: this.currentTheme, fairySelection: this.currentFairySelection };
            this.historyIndex++;
            this.history.splice(this.historyIndex, this.history.length, newState);
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
                this.historyIndex--;
            }
            this.redrawCanvas(false, true);
            this.updateUndoRedoButtons();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ColoringGame();
}); 