---
layout: default
title: Downloads
permalink: /downloads/
---

# Download Simbrain

{% assign latest = site.data.releases | where: "prerelease", false | first %}

{% if latest %}
## {{ latest.name }}
<p class="text-muted">Released: {{ latest.published | date: "%B %d, %Y" }}</p>
<div id="platform-message" class="alert alert-info mb-4" style="display: none;">
  <i class="bi bi-info-circle"></i> <span id="platform-text"></span>
</div>
<div class="d-flex flex-column gap-2 mb-4" id="download-cards">
{% for asset in latest.assets %}
  {% if asset.platform != 'other' %}
  <div class="download-item" data-platform="{{ asset.platform }}">
    <div class="card">
      <div class="card-body py-2 px-3 d-flex align-items-center">
        <span class="me-3 text-muted" style="font-size: 1.25rem;">
          {% if asset.platform == 'windows' %}
            <i class="bi bi-windows"></i>
          {% elsif asset.platform == 'mac-silicon' %}
            <i class="bi bi-apple"></i>
          {% elsif asset.platform == 'mac-intel' %}
            <i class="bi bi-apple"></i>
          {% elsif asset.platform == 'linux' or asset.platform == 'cross-platform' %}
            <i class="bi bi-terminal"></i>
          {% else %}
            <i class="bi bi-file-zip"></i>
          {% endif %}
        </span>
        <span class="fw-medium me-2" style="min-width: 140px;">
          {% if asset.platform == 'windows' %}
            Windows
          {% elsif asset.platform == 'mac-silicon' %}
            Mac (Apple Silicon)
          {% elsif asset.platform == 'mac-intel' %}
            Mac (Intel)
          {% elsif asset.platform == 'linux' %}
            Linux
          {% elsif asset.platform == 'cross-platform' %}
            Linux (ZIP)
          {% elsif asset.platform == 'full-zip' %}
            Cross-Platform (ZIP)
          {% else %}
            Download
          {% endif %}
        </span>
        <span class="text-muted small me-auto">
          {{ asset.name }}
          <span class="ms-1">({% assign size_mb = asset.size | divided_by: 1048576 %}{{ size_mb }} MB)</span>
        </span>
        <a href="{{ asset.url }}" class="btn btn-sm btn-primary">
          <i class="bi bi-download"></i> Download
        </a>
      </div>
    </div>
  </div>
  {% endif %}
{% endfor %}
</div>

<script>
(function() {
  // Detect user platform
  function detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    // Check for Mac
    if (userAgent.includes('mac') || platform.includes('mac')) {
      // Check for Apple Silicon
      // Safari on Apple Silicon reports this, or we can check via WebGL
      if (checkAppleSilicon()) {
        return { platform: 'mac-silicon', message: 'Your browser is running on a Mac with an Apple Silicon chip.' };
      }
      // Default to Intel Mac if we can't determine
      return { platform: 'mac-intel', message: 'Your browser is running on a Mac with an Intel chip.' };
    }
    
    // Check for Windows
    if (userAgent.includes('windows') || platform.includes('win')) {
      return { platform: 'windows', message: 'Your browser is running on Windows.' };
    }
    
    // Check for Linux
    if (userAgent.includes('linux') && !userAgent.includes('android')) {
      return { platform: 'linux', message: 'Your browser is running on Linux.' };
    }
    
    return null;
  }
  
  // Check for Apple Silicon using WebGL renderer info
  function checkAppleSilicon() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
          // Apple Silicon GPUs contain "apple" in their name
          if (renderer.includes('apple m') || renderer.includes('apple gpu')) {
            return true;
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  }
  
  // Reorder download cards to put detected platform first
  function reorderDownloads(detectedPlatform) {
    const container = document.getElementById('download-cards');
    if (!container) return;
    
    const items = Array.from(container.querySelectorAll('.download-item'));
    const matchingItem = items.find(item => item.dataset.platform === detectedPlatform);
    
    if (matchingItem) {
      // Move matching item to the beginning
      container.insertBefore(matchingItem, container.firstChild);
      // Add a highlight effect
      matchingItem.querySelector('.card')?.classList.add('border-primary', 'border-2');
    }
  }
  
  // Show platform message
  function showPlatformMessage(message) {
    const msgContainer = document.getElementById('platform-message');
    const msgText = document.getElementById('platform-text');
    if (msgContainer && msgText) {
      msgText.textContent = message;
      msgContainer.style.display = 'block';
    }
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    const detected = detectPlatform();
    if (detected) {
      showPlatformMessage(detected.message);
      reorderDownloads(detected.platform);
    }
  });
})();
</script>

<p class="mt-4">
  <a href="https://github.com/simbrain/simbrain/releases" rel="noopener">
    View all releases on GitHub <i class="bi bi-box-arrow-up-right"></i>
  </a>
</p>

<p class="mt-2 text-muted">
  <a href="https://v3.simbrain.net/Downloads/downloads_main.html" rel="noopener">Simbrain 3.0 Downloads</a>

{% else %}
<div class="alert alert-info">
  <i class="bi bi-info-circle"></i>
  Release information is being loaded. If this persists, please visit our
  <a href="https://github.com/simbrain/simbrain/releases" rel="noopener">GitHub releases page</a>.
</div>
{% endif %}
