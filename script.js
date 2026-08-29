/* ==========================================================================
   QR Converter Pro — script.js (FIXED VERSION)
   ========================================================================== */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const HISTORY_KEY = "qrConverterPro.history";
  const THEME_KEY = "qrConverterPro.theme";
  const MAX_HISTORY = 30;

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function isLikelyUrl(text) {
    if (!text) return false;
    return /^(https?:\/\/|www\.)/i.test(text.trim());
  }

  function normalizeUrl(text) {
    const t = text.trim();
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
  }

  /* ---------------------------------------------------------------------
     Theme toggle (persisted)
     --------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);

    $("theme-toggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    $("theme-icon-sun").style.display = theme === "dark" ? "none" : "block";
    $("theme-icon-moon").style.display = theme === "dark" ? "block" : "none";
  }

  /* ---------------------------------------------------------------------
     Tabs
     --------------------------------------------------------------------- */
  function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
        $(`panel-${tab.dataset.tab}`).classList.add("active");

        if (tab.dataset.tab !== "scan") stopCamera();
        if (tab.dataset.tab === "history") renderHistory();
      });
    });
  }

  /* ---------------------------------------------------------------------
     Generator: content type chips + dynamic fields
     --------------------------------------------------------------------- */
  let currentType = "text";

  function initTypeChips() {
    const chips = document.querySelectorAll("#type-chips .chip");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        currentType = chip.dataset.type;

        document.querySelectorAll(".input-block").forEach((block) => block.classList.add("hidden"));
        $(`input-${currentType}`).classList.remove("hidden");
        hideError($("generate-error"));
      });
    });
  }

  function buildPayload() {
    switch (currentType) {
      case "text": {
        const value = $("text-value").value.trim();
        if (!value) throw new Error("Enter some text to encode.");
        return value;
      }
      case "url": {
        const value = $("url-value").value.trim();
        if (!value) throw new Error("Enter a URL to encode.");
        return normalizeUrl(value);
      }
      case "phone": {
        const value = $("phone-value").value.trim();
        if (!value) throw new Error("Enter a phone number.");
        if (!/^[+\d][\d\s().-]{3,}$/.test(value)) throw new Error("That doesn't look like a valid phone number.");
        return `tel:${value.replace(/[\s()-]/g, "")}`;
      }
      case "email": {
        const value = $("email-value").value.trim();
        const subject = $("email-subject").value.trim();
        if (!value) throw new Error("Enter an email address.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
        return subject ? `mailto:${value}?subject=${encodeURIComponent(subject)}` : `mailto:${value}`;
      }
      case "wifi": {
        const ssid = $("wifi-ssid").value.trim();
        const password = $("wifi-password").value;
        const security = $("wifi-security").value;
        if (!ssid) throw new Error("Enter the network name (SSID).");
        if (security !== "nopass" && !password) throw new Error("Enter the network password, or set security to None.");
        const esc = (s) => s.replace(/([\\;,:"])/g, "\\$1");
        const passSegment = security === "nopass" ? "" : `P:${esc(password)};`;
        return `WIFI:T:${security};S:${esc(ssid)};${passSegment};`;
      }
      default:
        throw new Error("Unknown content type.");
    }
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
  function hideError(el) {
    el.classList.add("hidden");
    el.textContent = "";
  }

  /* ---------------------------------------------------------------------
     Generator: size slider label
     --------------------------------------------------------------------- */
  function initSizeSlider() {
    const slider = $("size-slider");
    const label = $("size-value");
    slider.addEventListener("input", () => { label.textContent = `${slider.value}px`; });
  }

  /* ---------------------------------------------------------------------
     Generate QR Code with better quality
     --------------------------------------------------------------------- */
  function generateQRCode(payload, size, dark, light) {
    return new Promise((resolve, reject) => {
      const canvas = $("qr-canvas");
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set canvas size with extra space for rendering quality
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = size * devicePixelRatio;
      canvas.height = size * devicePixelRatio;
      
      // Scale context for crisp rendering
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Ensure we have a working QRCode.toCanvas
      if (typeof QRCode === 'undefined' || typeof QRCode.toCanvas === 'undefined') {
        reject(new Error("QR library not available"));
        return;
      }
      
      // Create temporary canvas for QR generation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      
      // Generate QR on temp canvas with high quality settings
      QRCode.toCanvas(tempCanvas, payload, {
        width: size,
        margin: 4,  // Larger margin for better scanning
        color: {
          dark: dark,
          light: light
        }
      }, function(error) {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          // Copy from temp canvas to main canvas with high quality
          ctx.drawImage(tempCanvas, 0, 0, size, size, 0, 0, size, size);
          
          // Apply subtle anti-aliasing enhancement
          const imageData = ctx.getImageData(0, 0, size, size);
          ctx.putImageData(imageData, 0, 0);
          
          // Reset scale
          ctx.scale(1/devicePixelRatio, 1/devicePixelRatio);
          canvas.style.width = size + 'px';
          canvas.style.height = size + 'px';
          
          resolve(canvas);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Generator: generate + download + share (FIXED)
     --------------------------------------------------------------------- */
  function initGenerator() {
    // Check if QR library is available
    if (typeof QRCode === 'undefined') {
      console.error('QRCode library not available!');
      showError($("generate-error"), "QR library not loaded. Please check your internet connection.");
      return;
    }

    if (typeof QRCode.toCanvas === 'undefined') {
      console.error('QRCode.toCanvas not available!');
      showError($("generate-error"), "QR library compatibility issue. Please refresh the page.");
      return;
    }

    // Main generate function
    async function doGenerate() {
      hideError($("generate-error"));
      
      let payload;
      try {
        payload = buildPayload();
      } catch (err) {
        showError($("generate-error"), err.message);
        return;
      }

      console.log("Generating QR for:", payload);
      console.log("Payload length:", payload.length);

      const size = parseInt($("size-slider").value, 10);
      const dark = $("fg-color").value;
      const light = $("bg-color").value;

      try {
        await generateQRCode(payload, size, dark, light);
        
        console.log("QR generated successfully!");
        $("qr-empty-state").classList.add("hidden");
        $("qr-result").classList.remove("hidden");

        addHistoryEntry({
          kind: "generated",
          type: currentType,
          value: payload,
          timestamp: Date.now(),
        });
        
        showToast("QR code generated!");
      } catch (error) {
        console.error("QR Generation Error:", error);
        showError($("generate-error"), "Couldn't generate QR code. Try shorter text or different content.");
      }
    }

    // Generate button
    $("generate-btn").addEventListener("click", doGenerate);
    
    // Test button - generates a known working QR
    $("test-qr-btn").addEventListener("click", function() {
      // Temporarily switch to URL type with Google
      const originalType = currentType;
      const originalText = $("text-value").value;
      
      // Set to Google URL
      $("text-value").value = "https://google.com";
      currentType = "text";
      
      // Generate
      doGenerate().then(() => {
        // Restore original values
        currentType = originalType;
        $("text-value").value = originalText;
      });
    });

    // Download button
    $("download-btn").addEventListener("click", () => {
      const canvas = $("qr-canvas");
      const link = document.createElement("a");
      link.download = `qr-code-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Download started");
    });

    // Share button
    $("share-btn").addEventListener("click", async () => {
      const canvas = $("qr-canvas");
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        const file = new File([blob], "qr-code.png", { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "QR code" });
        } else if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          showToast("Image copied to clipboard");
        } else {
          showToast("Sharing isn't supported here — try Download instead");
        }
      } catch (err) {
        if (err && err.name !== "AbortError") {
          showToast("Couldn't share — try Download instead");
        }
      }
    });
  }

  /* ---------------------------------------------------------------------
     Scanner: camera (html5-qrcode)
     --------------------------------------------------------------------- */
  let html5QrCode = null;
  let cameraRunning = false;

  function initCameraScanner() {
    $("camera-start-btn").addEventListener("click", startCamera);
    $("camera-stop-btn").addEventListener("click", stopCamera);
  }

  async function startCamera() {
    hideError($("camera-error"));
    try {
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error("QR scanner library not loaded");
      }
      
      if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

      await html5QrCode.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
          stopCamera();
        },
        () => { /* per-frame callback - ignore */ }
      );

      cameraRunning = true;
      $("camera-start-btn").classList.add("hidden");
      $("camera-stop-btn").classList.remove("hidden");
    } catch (err) {
      showError(
        $("camera-error"),
        "Couldn't access the camera. Check that you've granted camera permission."
      );
    }
  }

  async function stopCamera() {
    if (html5QrCode && cameraRunning) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (err) {
        // ignore
      }
    }
    cameraRunning = false;
    $("camera-start-btn").classList.remove("hidden");
    $("camera-stop-btn").classList.add("hidden");
  }

  /* ---------------------------------------------------------------------
     Scanner: file upload
     --------------------------------------------------------------------- */
  function initFileScanner() {
    const fileInput = $("file-input");
    const dropZone = $("drop-zone");

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) scanFile(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove("drag-over"); })
    );
    dropZone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) scanFile(file);
    });
  }

  async function scanFile(file) {
    hideError($("file-error"));
    if (!file.type.startsWith("image/")) {
      showError($("file-error"), "Please choose an image file.");
      return;
    }

    $("scan-loading").classList.remove("hidden");
    $("scan-result").classList.add("hidden");

    try {
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error("QR scanner library not loaded");
      }
      
      if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, false);
      handleScanSuccess(decodedText);
    } catch (err) {
      showError($("file-error"), "No QR code found in that image. Try a clearer photo.");
    } finally {
      $("scan-loading").classList.add("hidden");
    }
  }

  /* ---------------------------------------------------------------------
     Scanner: shared result handling
     --------------------------------------------------------------------- */
  function handleScanSuccess(decodedText) {
    $("scan-result").classList.remove("hidden");
    $("scan-result-text").textContent = decodedText;

    const openBtn = $("open-link-btn");
    if (isLikelyUrl(decodedText)) {
      openBtn.href = normalizeUrl(decodedText);
      openBtn.classList.remove("hidden");
    } else {
      openBtn.classList.add("hidden");
    }

    addHistoryEntry({
      kind: "scanned",
      type: isLikelyUrl(decodedText) ? "url" : "text",
      value: decodedText,
      timestamp: Date.now(),
    });

    showToast("QR code decoded");
  }

  function initCopyButton() {
    $("copy-btn").addEventListener("click", async () => {
      const text = $("scan-result-text").textContent;
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard");
      } catch (err) {
        showToast("Couldn't copy — select and copy manually");
      }
    });
  }

  /* ---------------------------------------------------------------------
     History (localStorage)
     --------------------------------------------------------------------- */
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderHistory() {
    const history = getHistory();
    const list = $("history-list");
    const empty = $("history-empty");
    list.innerHTML = "";

    if (history.length === 0) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    history.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const icon = document.createElement("div");
      icon.className = "history-icon";
      icon.textContent = entry.kind === "generated" ? "GEN" : "SCAN";

      const body = document.createElement("div");
      body.className = "history-body";
      const value = document.createElement("div");
      value.className = "history-value";
      value.textContent = entry.value;
      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = `${entry.kind} · ${entry.type} · ${formatTimestamp(entry.timestamp)}`;
      body.appendChild(value);
      body.appendChild(meta);

      li.appendChild(icon);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function initHistoryPanel() {
    $("clear-history-btn").addEventListener("click", () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      showToast("History cleared");
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    console.log("QR Converter Pro starting...");
    console.log("QRCode library loaded:", typeof QRCode);
    console.log("QRCode.toCanvas available:", typeof QRCode?.toCanvas);
    console.log("Html5Qrcode library loaded:", typeof Html5Qrcode);
    
    initTheme();
    initTabs();
    initTypeChips();
    initSizeSlider();
    initGenerator();
    initCameraScanner();
    initFileScanner();
    initCopyButton();
    initHistoryPanel();
    renderHistory();
    
    // Auto-generate a QR on load
    setTimeout(() => {
      document.getElementById("generate-btn").click();
    }, 500);
  });
})();