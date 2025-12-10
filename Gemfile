source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "jekyll-sass-converter", "~> 2.0"  # Use older converter with sassc

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag", "~> 2.8"
  gem "jekyll-sitemap", "~> 1.4"
end

# Windows and JRuby do not include zoneinfo files
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance booster for watching directories
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock http_parser for JRuby builds
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]
