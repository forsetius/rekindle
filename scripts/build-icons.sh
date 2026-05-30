#!/usr/bin/env sh
set -eu

mkdir -p public/assets/icons

render_icon() {
  convert -background white -density 192 "$1" -resize 128x128 -gravity center -extent 128x128 -depth 8 -type Grayscale -strip "$2"
}

render_icon assets/icon-sources/sun.svg public/assets/icons/sun.png
render_icon assets/icon-sources/partly-cloudy.svg public/assets/icons/partly-cloudy.png
render_icon assets/icon-sources/cloud.svg public/assets/icons/cloud.png
render_icon assets/icon-sources/rain.svg public/assets/icons/rain.png
render_icon assets/icon-sources/storm.svg public/assets/icons/storm.png
render_icon assets/icon-sources/moon.svg public/assets/icons/moon.png
render_icon assets/icon-sources/air-quality.svg public/assets/icons/alert-air-quality.png
render_icon assets/icon-sources/cold.svg public/assets/icons/alert-cold.png
render_icon assets/icon-sources/flood.svg public/assets/icons/alert-flood.png
render_icon assets/icon-sources/heat.svg public/assets/icons/alert-heat.png
render_icon assets/icon-sources/other.svg public/assets/icons/alert-other.png
render_icon assets/icon-sources/storm.svg public/assets/icons/alert-storm.png
render_icon assets/icon-sources/wind.svg public/assets/icons/alert-wind.png
