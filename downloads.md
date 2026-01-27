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
  <div class="d-flex align-items-start">
    <i class="bi bi-info-circle me-2 mt-1"></i>
    <div>
      <div id="platform-text" class="fw-medium"></div>
      <div id="platform-detail" class="small mt-1 opacity-75"></div>
    </div>
  </div>
</div>
<div class="d-flex flex-column gap-2 mb-4" id="download-cards">
{% for asset in latest.assets %}
  {% if asset.platform != 'other' %}
  <div class="download-item" data-platform="{{ asset.platform }}">
    <div class="card">
      <div class="card-body py-2 px-3">
        <div class="row align-items-center g-2">
          <div class="col-12 col-sm-auto d-flex align-items-center">
            <span class="me-2 text-muted" style="font-size: 1.25rem;">
              {% if asset.platform == 'windows' %}
                <i class="bi bi-windows"></i>
              {% elsif asset.platform == 'mac-silicon' %}
                <i class="bi bi-apple"></i>
              {% elsif asset.platform == 'mac-intel' %}
                <i class="bi bi-apple"></i>
              {% elsif asset.platform == 'linux' or asset.platform == 'cross-platform' or asset.platform == 'linux-appimage' or asset.platform == 'linux-appimage-arm64' %}
                <i class="bi bi-terminal"></i>
              {% else %}
                <i class="bi bi-file-zip"></i>
              {% endif %}
            </span>
            <span class="fw-medium">
              {% if asset.platform == 'windows' %}
                Windows
              {% elsif asset.platform == 'mac-silicon' %}
                Mac (Apple Silicon)
              {% elsif asset.platform == 'mac-intel' %}
                Mac (Intel)
              {% elsif asset.platform == 'linux-appimage' %}
                Linux (AppImage)
              {% elsif asset.platform == 'linux-appimage-arm64' %}
                Linux ARM64 (AppImage)
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
          </div>
          <div class="col d-none d-sm-block">
            <span class="text-muted small">
              {{ asset.name }}
              <span class="ms-1">({% assign size_mb = asset.size | divided_by: 1048576 %}{{ size_mb }} MB)</span>
            </span>
          </div>
          <div class="col-12 col-sm-auto">
            <a href="{{ asset.url }}" class="btn btn-sm btn-primary d-block d-sm-inline-block">
              <i class="bi bi-download"></i> Download
            </a>
          </div>
        </div>
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
    
    // Skip detection for mobile devices (Simbrain is desktop only)
    if (/iphone|ipad|ipod|android|mobile|phone/i.test(navigator.userAgent)) {
      return null;
    }
    
    // Check for Mac
    if (userAgent.includes('mac') || platform.includes('mac')) {
      const siliconCheck = checkAppleSilicon();
      
      if (siliconCheck === true) {
        return { platform: 'mac-silicon', message: 'Detected: Mac (Apple Silicon)' };
      } else if (siliconCheck === false) {
        return { platform: 'mac-intel', message: 'Detected: Mac (Intel)' };
      }
      
      // If we can't determine, don't show anything
      return null;
    }

    // Check for Windows
    if (userAgent.includes('windows') || platform.includes('win')) {
      return {
        platform: 'windows',
        message: 'Detected: Windows',
        detail: 'The Windows installer is currently unsigned. You may need to click "More info" then "Run anyway". When upgrading, uninstall the previous version first.'
      };
    }

    // Check for Linux
    if (userAgent.includes('linux') && !userAgent.includes('android')) {
      const arch = detectLinuxArch(userAgent, platform);
      const appImageDetail = 'To run the AppImage: download it, make it executable (chmod +x), and run it. No installation required.';
      if (arch === 'arm64') {
        return { platform: 'linux-appimage-arm64', message: 'Detected: Linux (ARM64)', detail: appImageDetail };
      }
      return { platform: 'linux-appimage', message: 'Detected: Linux (x86_64)', detail: appImageDetail };
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
          
          // Intel Macs will have "intel" in the renderer string
          if (renderer.includes('intel') || renderer.includes('amd')) {
            return false;
          }
          
          // Apple Silicon has "apple m" (m1, m2, m3, etc.) or "apple gpu"
          if (renderer.includes('apple m') || renderer.includes('apple gpu')) {
            return true;
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
    // If we can't determine, return null to indicate unknown
    return null;
  }

  // Detect Linux CPU architecture
  function detectLinuxArch(userAgent, platform) {
    // Check navigator.platform (e.g., "Linux aarch64", "Linux x86_64")
    if (platform.includes('aarch64') || platform.includes('arm64') || platform.includes('armv8')) {
      return 'arm64';
    }
    // Check user agent string for architecture hints
    if (userAgent.includes('aarch64') || userAgent.includes('arm64')) {
      return 'arm64';
    }
    // Default to x86_64 for Linux
    return 'x86_64';
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
  function showPlatformMessage(message, detail) {
    const msgContainer = document.getElementById('platform-message');
    const msgText = document.getElementById('platform-text');
    const msgDetail = document.getElementById('platform-detail');
    if (msgContainer && msgText) {
      msgText.textContent = message;
      if (msgDetail) {
        msgDetail.textContent = detail || '';
        msgDetail.style.display = detail ? 'block' : 'none';
      }
      msgContainer.style.display = 'block';
    }
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    const detected = detectPlatform();
    if (detected) {
      showPlatformMessage(detected.message, detected.detail);
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
