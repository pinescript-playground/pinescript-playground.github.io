// Pine Script Playground Application
let chart = null;
let chartIndicator = null;
let isChartInitialized = false;
let historicalMarketData = null;
let historicalPlots = null;
let currentStream = null; // Track current stream for cleanup
let editor = null; // Ace Editor instance
let fullscreenEditor = null; // Fullscreen Ace Editor instance
let isFullscreenMode = false;
let currentLayout = 'tabs'; // 'split' or 'tabs' - Default to tabs
// const DATA_LENGTH = 500; // Deprecated: Now set via UI
let typingTimeout = null; // Timeout for typing indicator
let renderQueue = [];
let isProcessingQueue = false;

/**
 * Process the render queue with a cooldown
 */
function processRenderQueue() {
    if (isProcessingQueue || renderQueue.length === 0) return;

    isProcessingQueue = true;
    const task = renderQueue.shift();

    // Use a small delay to allow UI updates and prevent freezing
    setTimeout(() => {
        if (!currentStream) { // Check if stream was stopped
            isProcessingQueue = false;
            renderQueue = [];
            return;
        }

        try {
            task();
        } catch (error) {
            console.error('Error processing render task:', error);
        }

        isProcessingQueue = false;
        
        // Schedule next batch
        if (renderQueue.length > 0) {
            processRenderQueue();
        }
    }, 15); // 15ms delay between renders
}

/**
 * Detect if the device is mobile
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 768;
}

// Default Pine Script code
const DEFAULT_CODE = `//@version=5
indicator("My Indicator", overlay=true)

// Simple moving average crossover
fastMA = ta.sma(close, 9)
slowMA = ta.sma(close, 21)

// Plot the moving averages
plot(fastMA, "Fast MA", color.blue, linewidth=2)
plot(slowMA, "Slow MA", color.red, linewidth=2)

// Generate signals
bullCross = ta.crossover(fastMA, slowMA)
bearCross = ta.crossunder(fastMA, slowMA)

// Plot signals
plotshape(bullCross, "Buy", shape.triangleup, location.belowbar, color.green, size=size.small)
plotshape(bearCross, "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)`;

// Pine Script Examples
const examples = {
    sma: `//@version=5
indicator("Simple Moving Average", overlay=true)

length = input.int(20, "Length")
sma = ta.sma(close, length)

plot(sma, "SMA", color.blue, linewidth=2)`,

    ema: `//@version=5
indicator("EMA Crossover", overlay=true)

fast = ta.ema(close, 12)
slow = ta.ema(close, 26)

plot(fast, "Fast EMA", color.blue)
plot(slow, "Slow EMA", color.red)

bullCross = ta.crossover(fast, slow)
bearCross = ta.crossunder(fast, slow)

plotshape(bullCross, "Buy", shape.triangleup, location.belowbar, color.green)
plotshape(bearCross, "Sell", shape.triangledown, location.abovebar, color.red)`,

    rsi: `//@version=5
indicator("RSI", overlay=false)

length = input.int(14, "Length")
rsi = ta.rsi(close, length)

plot(rsi, "RSI", color.purple, linewidth=2)
hline(70, "Overbought", color.red, linestyle=hline.style_dashed)
hline(30, "Oversold", color.green, linestyle=hline.style_dashed)
hline(50, "Midline", color.gray, linestyle=hline.style_dotted)`,

    bb: `//@version=6
indicator(shorttitle="BB", title="Simple Bollinger Bands", overlay=true, timeframe="", timeframe_gaps=true)
length = 20
src = close
mult = 2.0
basis = ta.sma(src, length)
dev = mult * ta.stdev(src, length)
upper = basis + dev
lower = basis - dev
offset = input.int(0, "Offset", minval = -500, maxval = 500, display = display.data_window)
plot(basis, "_plot", color=#2962FF, offset = offset)
plot1 = plot(upper, "Upper", color=#F23645, offset = offset)
plot2 = plot(lower, "Lower", color=#089981, offset = offset)
fill(plot1, plot2, title = "Background", color=color.rgb(33, 150, 243, 85))`,

    macd: `//@version=6
indicator("Moving Average Convergence Divergence", "MACD", timeframe = "", timeframe_gaps = true)

// Inputs
float  sourceInput  = input.source(close, "Source")
int    fastLenInput = input.int(12, "Fast length",   1)
int    slowLenInput = input.int(26, "Slow length",   1)
int    sigLenInput  = input.int(9,  "Signal length", 1)
string oscTypeInput = input.string("EMA", "Oscillator MA type", ["EMA", "SMA"], display = display.data_window)
string sigTypeInput = input.string("EMA", "Signal MA type",     ["EMA", "SMA"], display = display.data_window)

// @function    Calculates an EMA or SMA of a 'source' series.
ma(float source, int length, simple string maType) =>
    switch maType
        "EMA" => ta.ema(source, length)
        "SMA" => ta.sma(source, length)

// Calculate and plot the MACD, signal, and histogram values.
float maFast = ma(sourceInput, fastLenInput, oscTypeInput)
float maSlow = ma(sourceInput, slowLenInput, oscTypeInput)
float macd   = maFast - maSlow
float signal = ma(macd, sigLenInput, sigTypeInput)
float hist   = macd - signal
color hColor = hist >= 0 ? hist > hist[1] ? #26a69a : #b2dfdb : hist > hist[1] ? #ffcdd2 : #ff5252

hline(0, "Zero", #787b8680)
plot(hist, "Histogram", hColor, style = plot.style_columns)
plot(macd, "MACD")
plot(signal, "Signal line", #ff6d00)
`,
};

/**
 * Load a Pine Script example into the editor
 */
function loadExample(name) {
    const code = examples[name];
    if (code && editor) {
        editor.setValue(code, -1); // -1 moves cursor to start
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.innerHTML = ''; // Clear content

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    status.appendChild(messageSpan);

    // Add Report Issue button for errors
    if (type === 'error') {
        const reportBtn = document.createElement('button');
        reportBtn.className = 'report-issue-btn';
        reportBtn.textContent = 'Report Issue';
        reportBtn.onclick = () => {
             const issueTitle = `Playground Error: ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`;
             let issueBody = `**Error Message:**\n${message}\n\n`;
             
             if (editor) {
                 const code = editor.getValue();
                 // Truncate code if too long to avoid URL limit issues
                 const maxCodeLen = 5000; 
                 const truncatedCode = code.length > maxCodeLen ? code.substring(0, maxCodeLen) + '\n... (truncated)' : code;
                 issueBody += `**Code:**\n\`\`\`pinescript\n${truncatedCode}\n\`\`\`\n`;
             }
             
             issueBody += `\n**Browser:** ${navigator.userAgent}`;
             
             const url = `https://github.com/QuantForgeOrg/PineTS/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
             window.open(url, '_blank');
        };
        status.appendChild(reportBtn);
    }

    status.className = `status ${type}`;
}

/**
 * Hide status message
 */
function hideStatus() {
    const status = document.getElementById('status');
    status.style.display = 'none';
}

/**
 * Detect if indicator should be overlay or separate pane
 */
function detectOverlay(code) {
    // Simple detection: look for overlay=true or overlay=false in indicator() declaration
    const match = code.match(/indicator\([^)]*overlay\s*=\s*(true|false)/i);
    if (match) {
        return match[1].toLowerCase() === 'true';
    }
    // Default to overlay=false (separate pane)
    return false;
}

/**
 * Get human-readable timeframe name
 */
function getTimeframeName(tf) {
    const names = {
        1: '1 Min',
        5: '5 Min',
        15: '15 Min',
        30: '30 Min',
        '1h': '1 Hour',
        '4h': '4 Hours',
        D: 'Daily',
        W: 'Weekly',
        M: 'Monthly',
    };
    return names[tf] || tf;
}

/**
 * Initialize chart with historical data
 */
function initializeChart(symbol, timeframe, isOverlay) {
    if (isChartInitialized || !historicalMarketData || !historicalPlots) {
        return;
    }

    const ohlcvData = historicalMarketData.map((k) => ({
        time: k.openTime,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
    }));

    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const chartContainer = document.getElementById('main-chart');
    chartContainer.innerHTML = ''; // Clear loading message

    chart = new QFChart.QFChart(chartContainer, {
        title: `${symbol} - ${getTimeframeName(timeframe)} - Live`,
        backgroundColor: '#0f172a', 
        height: '560px',
        padding: 0.1,
        databox: {
            position: 'right',
            triggerOn: isMobileDevice ? 'click' : 'mousemove',
            
        },
        dataZoom: {
            visible: true,
            position: 'top',
            height: 6,
            start: 80,
            end: 101,
        },
        layout: {
            mainPaneHeight: '70%',
            gap: 5,
        },
        controls: {
            collapse: true,
            maximize: true,
            fullscreen: true,
        },
    });

    // Set Market Data
    chart.setMarketData(ohlcvData);

    // Add Indicator
    chartIndicator = chart.addIndicator('User Indicator', historicalPlots, {
        overlay: isOverlay,
        height: isOverlay ? undefined : 30,
        titleColor: '#3b82f6',
        controls: { collapse: true, maximize: true },
    });

    // Register plugins
    chart.registerPlugin(new QFChart.MeasureTool());
    chart.registerPlugin(new QFChart.LineTool());
    chart.registerPlugin(new QFChart.FibonacciTool());

    isChartInitialized = true;
    console.log('✅ Chart initialized with', historicalMarketData.length, 'historical bars');
}

/**
 * Stop current stream and reset state
 */
function stopCurrentStream() {
    if (currentStream) {
        try {
            currentStream.stop();
            console.log('✅ Previous stream stopped');
        } catch (error) {
            console.warn('Error stopping stream:', error);
        }
        currentStream = null;
    }
}

/**
 * Save current script to file
 */
function saveScript() {
    if (!editor) return;
    
    const code = editor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Extract script name if possible, otherwise default
    const match = code.match(/indicator\s*\(\s*["']([^"']+)["']/);
    const filename = match ? `${match[1].replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pine` : 'script.pine';
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Load script from file
 */
function loadScript(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        if (editor) {
            editor.setValue(e.target.result, -1);
        }
        // Reset input
        event.target.value = '';
    };
    reader.readAsText(file);
}

/**
 * Run the Pine Script indicator with live streaming
 */
async function runIndicator() {
    const code = editor ? editor.getValue().trim() : '';
    const symbol = document.getElementById('symbol-select').value;
    const timeframe = document.getElementById('timeframe').value;
    const updateFreq = parseInt(document.getElementById('update-freq').value, 10);
    const dataLength = parseInt(document.getElementById('data-length').value, 10);
    const runBtn = document.getElementById('run-btn');

    if (!code) {
        showStatus('Please enter Pine Script code', 'error');
        return;
    }

    try {
        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        showStatus(`Connecting to live ${symbol} stream...`, 'loading');

        // Stop existing stream
        stopCurrentStream();

        // Clear render queue
        renderQueue = [];
        isProcessingQueue = false;

        // Reset state
        isChartInitialized = false;
        historicalMarketData = null;
        historicalPlots = null;
        chartIndicator = null;

        // Destroy existing chart
        if (chart) {
            chart.destroy();
            chart = null;
        }

        // Clear chart container
        const chartContainer = document.getElementById('main-chart');
        chartContainer.innerHTML = '<p class="loading">Loading...</p>';

        // Detect if indicator is overlay or separate pane
        const isOverlay = detectOverlay(code);

        // Create PineTS instance with streaming
        const pineTS = new PineTS(PineTS.Provider.Binance, symbol, timeframe, dataLength);
        
        // Start streaming
        const stream = pineTS.stream(code, {
            pageSize: 500,
            live: true,
            interval: updateFreq, 
        });

        // Store stream reference for cleanup
        currentStream = stream;

        // Handle stream data
        let count = 0;
        stream.on('data', (ctx) => {
            renderQueue.push(() => {
                // Ensure this task belongs to the active stream
                if (currentStream !== stream) return;
                
                if (!isChartInitialized) {

                    // Store initial historical data
                    historicalMarketData = ctx.marketData;
                    historicalPlots = ctx.fullContext ? ctx.fullContext.plots : ctx.plots;
                    
                    // Initialize chart
                    initializeChart(symbol, timeframe, isOverlay);
                    
                    // Re-enable button and update text
                    runBtn.disabled = false;
                    runBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                    showStatus(`${historicalMarketData.length} bars loaded : Switch to Chart tab to see the full chart`, 'success');

                    // In tab mode, the chart preview will show instead of auto-switching
                } else {
                    // Live update - update indicator first, then chart data
                    if (chartIndicator && ctx.plots) {                    
                        chartIndicator.updateData(ctx.plots);
                    }

                    // Update chart with latest bar
                    const lastBar = ctx.marketData[ctx.marketData.length - 1];
                    const updateBar = {
                        time: lastBar.openTime,
                        open: lastBar.open,
                        high: lastBar.high,
                        low: lastBar.low,
                        close: lastBar.close,
                        volume: lastBar.volume,
                    };

                    chart.updateData([updateBar]);
                }
            });
            processRenderQueue();
        });

        // Handle stream errors
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            showStatus(`Stream error: ${error.message || 'Connection failed'}`, 'error');
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            currentStream = null;
        });

    } catch (error) {
        console.error('Error running indicator:', error);
        showStatus(`Error: ${error.message || 'Failed to start stream'}`, 'error');
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        currentStream = null;
    }
}

/**
 * Initialize Ace Editor
 */
function initEditor() {
    editor = ace.edit('pine-code');
    editor.setTheme('ace/theme/monokai');
    editor.session.setMode('ace/mode/pinescript'); // Custom Pine Script mode
    editor.setOptions({
        fontSize: '14px',
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        tabSize: 4,
        useSoftTabs: true,
    });
    
    // Set default code
    editor.setValue(DEFAULT_CODE, -1);
    
    // Allow Ctrl+Enter to run
    editor.commands.addCommand({
        name: 'runIndicator',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: function () {
            runIndicator();
        },
    });
    
    // Add typing indicator for chart preview
    const handleEditorActivity = function() {
        const previewContainer = document.getElementById('chart-preview');
        if (!previewContainer) return;
        
        // Add typing class for low opacity
        previewContainer.classList.add('typing');
        
        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Remove typing class after 5 seconds of inactivity
        typingTimeout = setTimeout(() => {
            previewContainer.classList.remove('typing');
        }, 500);
    };
    
    // Listen to content changes (typing, paste, etc.)
    editor.session.on('change', handleEditorActivity);
    
    // Listen to selection changes (arrow keys, mouse clicks, etc.)
    editor.selection.on('changeSelection', handleEditorActivity);
    
    // Listen to cursor changes (all cursor movements)
    editor.selection.on('changeCursor', handleEditorActivity);
}

/**
 * Initialize Fullscreen Editor
 */
function initFullscreenEditor() {
    fullscreenEditor = ace.edit('pine-code-fullscreen');
    fullscreenEditor.setTheme('ace/theme/monokai');
    fullscreenEditor.session.setMode('ace/mode/pinescript');
    fullscreenEditor.setOptions({
        fontSize: '16px',
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        tabSize: 4,
        useSoftTabs: true,
    });
    
    // Sync with main editor
    fullscreenEditor.setValue(editor.getValue(), -1);
    
    // Allow Ctrl+Enter to run from fullscreen
    fullscreenEditor.commands.addCommand({
        name: 'runIndicator',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: function () {
            syncFromFullscreen();
            closeFullscreen();
            runIndicator();
        },
    });
}

/**
 * Open fullscreen editor
 */
function openFullscreen() {
    if (!fullscreenEditor) {
        initFullscreenEditor();
    }
    
    // Sync code from main editor to fullscreen
    fullscreenEditor.setValue(editor.getValue(), -1);
    
    // Show modal
    const modal = document.getElementById('fullscreen-modal');
    modal.classList.add('active');
    isFullscreenMode = true;
    
    // Focus fullscreen editor
    setTimeout(() => {
        fullscreenEditor.focus();
        fullscreenEditor.resize();
    }, 100);
}

/**
 * Close fullscreen editor
 */
function closeFullscreen() {
    const modal = document.getElementById('fullscreen-modal');
    modal.classList.remove('active');
    isFullscreenMode = false;
    
    // Sync code back to main editor
    syncFromFullscreen();
}

/**
 * Sync code from fullscreen to main editor
 */
function syncFromFullscreen() {
    if (fullscreenEditor) {
        editor.setValue(fullscreenEditor.getValue(), -1);
    }
}

/**
 * Switch active tab
 */
function switchTab(targetId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // Update panels
    document.querySelectorAll('.layout-tabs .editor-panel, .layout-tabs .chart-panel').forEach(panel => {
        if (panel.id === targetId) {
            panel.classList.add('active');
            // Trigger resize for charts/editors
            if (targetId === 'editor-panel' && editor) editor.resize();
            if (targetId === 'chart-panel' && chart) chart.resize();
        } else {
            panel.classList.remove('active');
        }
    });
}

/**
 * Toggle Layout Mode
 */
function toggleLayout() {
    const container = document.body; // Using body to scope everything if needed, but mainly targeting specific containers
    const playgroundContainer = document.getElementById('playground-container');
    const toggleBtn = document.getElementById('layout-toggle');
    const toggleBtnTabs = document.getElementById('layout-toggle-tabs');
    
    const updateToggleButtons = (layout) => {
        const isSplit = layout === 'split';
        const icon = isSplit ? 'fa-table-columns' : 'fa-columns';
        const tooltip = isSplit ? 'Switch to Tab View' : 'Switch to Split View';
        
        [toggleBtn, toggleBtnTabs].forEach(btn => {
            if (btn) {
                const iconEl = btn.querySelector('i');
                if (iconEl) iconEl.className = `fa-solid ${icon}`;
                btn.setAttribute('data-tooltip', tooltip);
            }
        });
    };

    if (currentLayout === 'split') {
        // Switch to Tabs
        currentLayout = 'tabs';
        container.classList.remove('layout-split');
        container.classList.add('layout-tabs');
        updateToggleButtons('tabs');
        
        // Default to Code tab
        switchTab('editor-panel');
    } else {
        // Switch to Split
        currentLayout = 'split';
        container.classList.remove('layout-tabs');
        container.classList.add('layout-split');
        updateToggleButtons('split');
        
        // Remove active classes to reset display
        document.querySelectorAll('.editor-panel, .chart-panel').forEach(el => {
            el.classList.remove('active');
            el.style.display = ''; // Reset inline style
        });
        
        if (editor) editor.resize();
        if (chart) chart.resize();
    }
}

/**
 * Initialize the application
 */
function initApp() {
    // Set initial layout based on device type
    // Mobile devices default to split view, desktop to tabs
    const defaultLayout = isMobile() ? 'split' : 'tabs';
    currentLayout = defaultLayout;
    document.body.classList.add(`layout-${defaultLayout}`);
    
    // Initialize with Code tab active (for tabs layout)
    if (defaultLayout === 'tabs') {
        switchTab('editor-panel');
    }

    // Initialize Ace Editor
    initEditor();
    
    // Event listener for Run button
    document.getElementById('run-btn').addEventListener('click', runIndicator);
    
    // Event listeners for Save/Load
    document.getElementById('save-btn').addEventListener('click', saveScript);
    
    const fileInput = document.getElementById('file-input');
    document.getElementById('load-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', loadScript);
    
    // Fullscreen button
    document.getElementById('fullscreen-btn').addEventListener('click', openFullscreen);
    
    // Close fullscreen button
    document.getElementById('close-fullscreen-btn').addEventListener('click', closeFullscreen);
    
    // Layout Toggle (both buttons)
    document.getElementById('layout-toggle').addEventListener('click', toggleLayout);
    const layoutToggleTabs = document.getElementById('layout-toggle-tabs');
    if (layoutToggleTabs) {
        layoutToggleTabs.addEventListener('click', toggleLayout);
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.currentTarget.dataset.target);
        });
    });
    
    // Escape key to close fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFullscreenMode) {
            closeFullscreen();
        }
        // F11 to toggle fullscreen
        if (e.key === 'F11') {
            e.preventDefault();
            if (isFullscreenMode) {
                closeFullscreen();
            } else {
                openFullscreen();
            }
        }
    });
    
    // Click outside modal content to close
    document.getElementById('fullscreen-modal').addEventListener('click', (e) => {
        if (e.target.id === 'fullscreen-modal') {
            closeFullscreen();
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopCurrentStream();
    });

    // Optionally auto-run on load
    // runIndicator();
}

/**
 * Initialize custom tooltips
 */
function initTooltips() {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    document.body.appendChild(tooltip);

    let activeElement = null;

    const showTooltip = (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;

        const text = target.getAttribute('data-tooltip');
        if (!text) return;

        activeElement = target;
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        updatePosition(target);
    };

    const hideTooltip = () => {
        tooltip.classList.remove('visible');
        activeElement = null;
    };

    const updatePosition = (target) => {
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;

        // Keep in viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 8; // Flip to bottom if no space on top
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    };

    document.addEventListener('mouseover', showTooltip);
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('[data-tooltip]')) {
            hideTooltip();
        }
    });
    
    // Hide on scroll
    window.addEventListener('scroll', hideTooltip, true);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initApp();
    initTooltips();
});

