/**
 * Chart Preview Module
 * Provides a draggable, resizable preview of the chart when in Code tab (tab layout)
 */

class ChartPreview {
    constructor() {
        this.previewContainer = null;
        this.previewCanvas = null;
        this.sourceCanvas = null;
        this.updateInterval = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.hasMoved = false;
        this.minWidth = 200;
        this.minHeight = 150;
        this.defaultWidth = 400;
        this.defaultHeight = 300;
        this.isCollapsed = false;
        this.collapsedIcon = null;
        
        // Persistent state
        this.storageKey = 'chartPreviewState_v2';
        this.savedState = this.loadState();
        
        this.init();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load chart preview state:', e);
            return null;
        }
    }

    saveState() {
        if (!this.previewContainer) return;
        
        // Don't save if container is hidden (dimensions will be 0)
        if (this.previewContainer.style.display === 'none' && !this.isCollapsed) return;
        
        const rect = this.previewContainer.getBoundingClientRect();
        
        // Don't save invalid dimensions
        if (rect.width === 0 || rect.height === 0) return;

        const state = {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top,
            isCollapsed: this.isCollapsed
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
            this.savedState = state; // Update local state immediately
        } catch (e) {
            console.warn('Failed to save chart preview state:', e);
        }
    }

    init() {
        this.createPreviewContainer();
        this.createCollapsedIcon();
        this.attachEventListeners();
        this.startWatching();
    }

    createPreviewContainer() {
        // Create container
        this.previewContainer = document.createElement('div');
        this.previewContainer.id = 'chart-preview';
        this.previewContainer.className = 'chart-preview';
        this.previewContainer.style.display = 'none';

        // Create header with close button
        const header = document.createElement('div');
        header.className = 'chart-preview-header';
        header.innerHTML = `
            <span class="chart-preview-title">
                <i class="fa-solid fa-chart-line"></i>
                <span class="text-default">Chart Preview</span>
                <span class="text-hover">Chart Preview : Click to enlarge</span>
            </span>
            <button class="chart-preview-close" title="Collapse Preview">
                <i class="fa-solid fa-minus"></i>
            </button>
        `;

        // Create canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.className = 'chart-preview-canvas';
        this.previewCanvas.style.cursor = 'pointer';
        
        // Create resize handles for all 8 directions (4 corners + 4 borders)
        const resizeHandles = `
            <div class="chart-preview-resize n" data-direction="n"></div>
            <div class="chart-preview-resize s" data-direction="s"></div>
            <div class="chart-preview-resize e" data-direction="e"></div>
            <div class="chart-preview-resize w" data-direction="w"></div>
            <div class="chart-preview-resize nw" data-direction="nw"></div>
            <div class="chart-preview-resize ne" data-direction="ne"></div>
            <div class="chart-preview-resize sw" data-direction="sw"></div>
            <div class="chart-preview-resize se" data-direction="se"></div>
        `;

        this.previewContainer.appendChild(header);
        this.previewContainer.appendChild(this.previewCanvas);
        this.previewContainer.insertAdjacentHTML('beforeend', resizeHandles);

        document.body.appendChild(this.previewContainer);
    }

    createCollapsedIcon() {
        this.collapsedIcon = document.createElement('div');
        this.collapsedIcon.id = 'chart-preview-icon';
        this.collapsedIcon.className = 'chart-preview-icon';
        this.collapsedIcon.style.display = 'none';
        this.collapsedIcon.innerHTML = `
            <i class="fa-solid fa-chart-line"></i>
        `;
        this.collapsedIcon.title = 'Show Chart Preview';
        
        document.body.appendChild(this.collapsedIcon);
    }

    attachEventListeners() {
        const header = this.previewContainer.querySelector('.chart-preview-header');
        const closeBtn = this.previewContainer.querySelector('.chart-preview-close');
        const resizeHandles = this.previewContainer.querySelectorAll('.chart-preview-resize');

        // Dragging - attach to entire container
        this.previewContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Resizing - all corners
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e));
        });
        document.addEventListener('mousemove', (e) => this.onResize(e));
        document.addEventListener('mouseup', () => this.stopResize());

        // Collapse/Expand button
        closeBtn.addEventListener('click', () => this.collapse());

        // Collapsed icon click
        this.collapsedIcon.addEventListener('click', () => this.expand());

        // Canvas click - switch to chart tab (only if not dragging)
        this.previewCanvas.addEventListener('click', (e) => {
            // Only switch tabs if there was no dragging movement
            if (!this.hasMoved) {
                // Call the global switchTab function if it exists
                if (typeof switchTab === 'function') {
                    switchTab('chart-panel');
                    // Check and show onboarding tooltip
                    this.checkAndShowOnboarding();
                }
            }
        });

        // Prevent text selection during drag/resize
        header.addEventListener('selectstart', (e) => e.preventDefault());
        resizeHandles.forEach(handle => {
            handle.addEventListener('selectstart', (e) => e.preventDefault());
        });
    }

    checkAndShowOnboarding() {
        if (localStorage.getItem('codeTabTooltipSeen')) return;

        // Small delay to ensure tab switch happens first
        setTimeout(() => {
            const codeTabBtn = document.querySelector('.tab-btn[data-target="editor-panel"]');
            if (!codeTabBtn) return;

            const rect = codeTabBtn.getBoundingClientRect();
            
            const tooltip = document.createElement('div');
            tooltip.className = 'onboarding-tooltip';
            tooltip.innerHTML = `
                <span>Switch back to code here</span>
                <button class="ok-btn">OK</button>
            `;

            document.body.appendChild(tooltip);

            // Position it
            tooltip.style.top = `${rect.bottom + 12}px`;
            tooltip.style.left = `${rect.left}px`;

            const okBtn = tooltip.querySelector('.ok-btn');
            
            const closeTooltip = (e) => {
                if (e) e.stopPropagation();
                tooltip.remove();
                localStorage.setItem('codeTabTooltipSeen', 'true');
                codeTabBtn.removeEventListener('click', closeTooltip);
            };

            okBtn.addEventListener('click', closeTooltip);
            codeTabBtn.addEventListener('click', closeTooltip);
            
            // Also close on any click outside
            document.addEventListener('click', function onClickOutside(e) {
                if (!tooltip.contains(e.target) && e.target !== codeTabBtn) {
                     // Don't close immediately if clicking elsewhere, let user interact
                }
            }, { once: true });
        }, 300);
    }

    startDrag(e) {
        // Prevent drag if clicking close button or resize handles
        if (e.target.closest('.chart-preview-close') || 
            e.target.closest('.chart-preview-resize')) return;
        
        this.isDragging = true;
        this.hasMoved = false;
        this.dragStartPos.x = e.clientX;
        this.dragStartPos.y = e.clientY;
        const rect = this.previewContainer.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.previewContainer.style.cursor = 'grabbing';
        this.previewCanvas.style.cursor = 'grabbing';
        const header = this.previewContainer.querySelector('.chart-preview-header');
        if (header) header.style.cursor = 'grabbing';
    }

    onDrag(e) {
        if (!this.isDragging) return;

        let x = e.clientX - this.dragOffset.x;
        let y = e.clientY - this.dragOffset.y;

        // Check if mouse has moved significantly (more than 3 pixels)
        const deltaX = Math.abs(e.clientX - this.dragStartPos.x);
        const deltaY = Math.abs(e.clientY - this.dragStartPos.y);
        if (deltaX > 3 || deltaY > 3) {
            this.hasMoved = true;
        }

        // Keep within viewport bounds
        const rect = this.previewContainer.getBoundingClientRect();
        x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
        y = Math.max(0, Math.min(y, window.innerHeight - rect.height));

        this.previewContainer.style.left = `${x}px`;
        this.previewContainer.style.top = `${y}px`;
        this.previewContainer.style.right = 'auto';
        this.previewContainer.style.bottom = 'auto';
    }

    stopDrag() {
        this.isDragging = false;
        this.previewContainer.style.cursor = '';
        this.previewCanvas.style.cursor = 'pointer';
        const header = this.previewContainer.querySelector('.chart-preview-header');
        if (header) header.style.cursor = 'grab';
        this.saveState(); // Save position after drag
    }

    startResize(e) {
        e.stopPropagation();
        this.isResizing = true;
        this.resizeDirection = e.currentTarget.dataset.direction;
        const rect = this.previewContainer.getBoundingClientRect();
        
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
        };
    }

    onResize(e) {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.resizeStart.x;
        const deltaY = e.clientY - this.resizeStart.y;
        const direction = this.resizeDirection;

        let newWidth = this.resizeStart.width;
        let newHeight = this.resizeStart.height;
        let newLeft = this.resizeStart.left;
        let newTop = this.resizeStart.top;

        // Handle different directions
        if (direction.includes('e')) { // East (right side)
            newWidth = Math.max(this.minWidth, this.resizeStart.width + deltaX);
        }
        if (direction.includes('w')) { // West (left side)
            newWidth = Math.max(this.minWidth, this.resizeStart.width - deltaX);
            if (newWidth > this.minWidth) {
                newLeft = this.resizeStart.left + deltaX;
            }
        }
        if (direction.includes('s')) { // South (bottom)
            newHeight = Math.max(this.minHeight, this.resizeStart.height + deltaY);
        }
        if (direction.includes('n')) { // North (top)
            newHeight = Math.max(this.minHeight, this.resizeStart.height - deltaY);
            if (newHeight > this.minHeight) {
                newTop = this.resizeStart.top + deltaY;
            }
        }

        this.previewContainer.style.width = `${newWidth}px`;
        this.previewContainer.style.height = `${newHeight}px`;
        this.previewContainer.style.left = `${newLeft}px`;
        this.previewContainer.style.top = `${newTop}px`;
        this.previewContainer.style.right = 'auto';
        this.previewContainer.style.bottom = 'auto';

        this.updateCanvasSize();
    }

    stopResize() {
        this.isResizing = false;
        this.saveState(); // Save size after resize
    }

    updateCanvasSize() {
        if (!this.previewCanvas) return;
        
        const container = this.previewContainer;
        const header = container.querySelector('.chart-preview-header');
        const headerHeight = header ? header.offsetHeight : 30;
        
        this.previewCanvas.style.width = '100%';
        this.previewCanvas.style.height = `calc(100% - ${headerHeight}px)`;
    }

    startWatching() {
        // Check conditions and update every 500ms
        setInterval(() => {
            this.checkAndUpdate();
        }, 500);
    }

    checkAndUpdate() {
        const isTabLayout = document.body.classList.contains('layout-tabs');
        const isCodeTabActive = document.getElementById('editor-panel')?.classList.contains('active');
        const sourceCanvas = document.querySelector('#main-chart canvas');

        const shouldShow = isTabLayout && isCodeTabActive && sourceCanvas;

        if (shouldShow) {
            // Restore collapsed state from saved state on first show
            if (this.savedState && this.savedState.isCollapsed && !this.isCollapsed) {
                this.isCollapsed = true;
            }
            
            if (!this.isCollapsed && this.previewContainer.style.display === 'none') {
                this.show();
            } else if (this.isCollapsed && this.collapsedIcon.style.display === 'none') {
                this.showCollapsedIcon();
            }
            this.sourceCanvas = sourceCanvas;
            if (!this.isCollapsed) {
                this.updatePreview();
            }
        } else {
            if (this.previewContainer.style.display !== 'none') {
                this.hide();
            }
            if (this.collapsedIcon.style.display !== 'none') {
                this.hideCollapsedIcon();
            }
        }
    }

    updatePreview() {
        if (!this.sourceCanvas || !this.previewCanvas) return;

        try {
            const ctx = this.previewCanvas.getContext('2d');
            
            // Set canvas internal dimensions
            const displayWidth = this.previewCanvas.offsetWidth;
            const displayHeight = this.previewCanvas.offsetHeight;
            
            if (this.previewCanvas.width !== displayWidth || this.previewCanvas.height !== displayHeight) {
                this.previewCanvas.width = displayWidth;
                this.previewCanvas.height = displayHeight;
            }

            // Clear and draw
            ctx.clearRect(0, 0, displayWidth, displayHeight);
            ctx.drawImage(this.sourceCanvas, 0, 0, displayWidth, displayHeight);
        } catch (error) {
            console.warn('Error updating chart preview:', error);
        }
    }

    show() {
        if (!this.previewContainer) return;

        // Restore saved state if available and valid
        let restored = false;
        if (this.savedState && !this.isCollapsed) {
            // Check if saved state has valid dimensions
            if (this.savedState.width > 0 && this.savedState.height > 0) {
                this.previewContainer.style.left = `${this.savedState.left}px`;
                this.previewContainer.style.top = `${this.savedState.top}px`;
                this.previewContainer.style.width = `${this.savedState.width}px`;
                this.previewContainer.style.height = `${this.savedState.height}px`;
                this.previewContainer.style.right = 'auto';
                this.previewContainer.style.bottom = 'auto';
                restored = true;
            }
        } 
        
        if (!restored) {
            // Default position in top-right corner of editor (inside the editor panel)
            const editorContainer = document.querySelector('#editor-panel .editor-container');
            if (editorContainer) {
                const rect = editorContainer.getBoundingClientRect();
                this.previewContainer.style.right = `${window.innerWidth - rect.right + 10}px`;
                this.previewContainer.style.top = `${rect.top + 50}px`;
                this.previewContainer.style.left = 'auto';
                this.previewContainer.style.bottom = 'auto';
            }
            
            this.previewContainer.style.width = `${this.defaultWidth}px`;
            this.previewContainer.style.height = `${this.defaultHeight}px`;
        }

        this.previewContainer.style.display = 'block';
        this.isCollapsed = false;
        this.updateCanvasSize();
    }

    hide() {
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
        }
        this.isCollapsed = false;
    }

    collapse() {
        // Save state before hiding to capture correct dimensions
        this.isCollapsed = true;
        this.saveState(); 
        
        if (this.previewContainer) {
            this.previewContainer.style.display = 'none';
        }
        this.showCollapsedIcon();
    }

    expand() {
        if (this.collapsedIcon) {
            this.collapsedIcon.style.display = 'none';
        }
        this.isCollapsed = false;
        this.show();
        this.saveState(); // Save expanded state
    }

    showCollapsedIcon() {
        if (!this.collapsedIcon) return;
        
        // Position in top-right corner of editor container (inside)
        const editorContainer = document.querySelector('#editor-panel .editor-container');
        if (editorContainer) {
            const rect = editorContainer.getBoundingClientRect();
            this.collapsedIcon.style.right = `${window.innerWidth - rect.right + 10}px`;
            this.collapsedIcon.style.top = `${rect.top + 10}px`;
        }
        
        this.collapsedIcon.style.display = 'flex';
    }

    hideCollapsedIcon() {
        if (this.collapsedIcon) {
            this.collapsedIcon.style.display = 'none';
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.previewContainer) {
            this.previewContainer.remove();
        }
    }
}

// Initialize when DOM is ready
let chartPreviewInstance = null;

/**
 * Detect if the device is mobile
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 768;
}

function initChartPreview() {
    // Don't initialize chart preview on mobile devices
    if (isMobile()) {
        return;
    }
    
    if (!chartPreviewInstance) {
        chartPreviewInstance = new ChartPreview();
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChartPreview);
} else {
    initChartPreview();
}

