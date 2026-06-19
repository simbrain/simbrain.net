require 'net/http'
require 'json'

module Jekyll
  class GitHubReleasesGenerator < Generator
    safe true
    priority :high

    def generate(site)
      repo = site.config['github_repo'] || 'simbrain/simbrain'

      Jekyll.logger.info "GitHub Releases:", "Fetching releases from #{repo}..."

      begin
        uri = URI("https://api.github.com/repos/#{repo}/releases")
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true

        request = Net::HTTP::Get.new(uri)
        request['User-Agent'] = 'Jekyll GitHub Releases Generator'
        request['Accept'] = 'application/vnd.github.v3+json'

        # Use GitHub token if available (increases rate limit from 60 to 5000 req/hr)
        if ENV['GITHUB_TOKEN']
          request['Authorization'] = "Bearer #{ENV['GITHUB_TOKEN']}"
        end

        response = http.request(request)

        if response.code == '200'
          releases = JSON.parse(response.body)

          site.data['releases'] = releases.map do |release|
            {
              'tag' => release['tag_name'],
              'name' => release['name'] || release['tag_name'],
              'published' => release['published_at'],
              'prerelease' => release['prerelease'],
              'body' => release['body'],
              'html_url' => release['html_url'],
              'assets' => (release['assets'] || []).map do |asset|
                platform = detect_platform(asset['name'])
                {
                  'name' => asset['name'],
                  'url' => asset['browser_download_url'],
                  'size' => asset['size'],
                  'download_count' => asset['download_count'],
                  'platform' => platform,
                  'display_name' => platform_display_name(platform)
                }
              end.sort_by { |asset| asset['display_name'].downcase }
            }
          end

          Jekyll.logger.info "GitHub Releases:", "Found #{releases.length} releases"
        else
          Jekyll.logger.warn "GitHub Releases:", "Failed to fetch releases: #{response.code}"
          site.data['releases'] = []
        end
      rescue StandardError => e
        Jekyll.logger.error "GitHub Releases:", "Error fetching releases: #{e.message}"
        site.data['releases'] = []
      end
    end

    def detect_platform(filename)
      case filename.downcase
      when /installer.*\.msi$/, /\.msi$/, /installer.*\.exe$/, /\.exe$/
        'windows'
      when /_x64\.dmg$/, /-intel\.dmg$/, /intel.*\.dmg$/i
        'mac-intel'
      when /\.dmg$/
        'mac-silicon'
      when /aarch64\.appimage$/, /arm64\.appimage$/
        'linux-appimage-arm64'
      when /x86_64\.appimage$/, /\.appimage$/
        'linux-appimage'
      when /_full\.zip$/
        'full-zip'
      when /\.zip$/
        'cross-platform'
      when /\.tar\.gz$/, /\.tgz$/
        'linux'
      else
        'other'
      end
    end

    def platform_display_name(platform)
      {
        'windows' => 'Windows',
        'mac-silicon' => 'Mac (Apple Silicon)',
        'mac-intel' => 'Mac (Intel)',
        'linux-appimage' => 'Linux (AppImage)',
        'linux-appimage-arm64' => 'Linux ARM64 (AppImage)',
        'linux' => 'Linux',
        'cross-platform' => 'Linux (ZIP)',
        'full-zip' => 'Cross-Platform (ZIP)',
        'other' => 'Download'
      }.fetch(platform, 'Download')
    end
  end
end
