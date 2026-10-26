# XIA 俠: The way of motion

A concept site for a kung fu–inspired fashion label: cinematic video scenes, a shoppable collection, product pages and a bag. It's plain HTML, CSS and JavaScript, with GSAP, ScrollTrigger and Lenis loaded from a CDN.

Images and videos are not in this repo. To run the site, rebuild them into `assets/img/` and `assets/video/`:

```bash
bash tools/build-media.sh ~/Downloads             # site videos and posters from the four source clips
python -I tools/build-photos.py path/to/photos    # product and editorial photos (sources listed in CREDITS.md)
python -m http.server 8642                        # then open http://localhost:8642
```

## What's here

- `index.html`, `product.html`: the home page and the product page
- `assets/css/style.css`: all styles
- `assets/js/`: catalogue data, bag, product cards, shared site behaviour, home and product page scripts
- `tools/build-media.sh`: encodes the seamless video loops, phone crops and posters with ffmpeg
- `tools/build-photos.py`: crops the Unsplash photography into product and editorial images
- `tools/recorder/`: records the launch film from the live site (Playwright and Chrome) and assembles it with an original score
- `tools/monitor-composite.py`: plays a video on the screen of a monitor mockup image

Product names, prices and contact details are placeholders. Checkout is not connected.
