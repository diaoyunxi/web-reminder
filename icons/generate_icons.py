#!/usr/bin/env python3
"""Generate PNG icons from SVG for Chrome extension"""

import xml.etree.ElementTree as ET
import struct
import zlib
from math import sqrt

def create_png(width, height, svg_content):
    """Create a simple PNG from SVG content"""
    # Parse SVG to extract colors and shapes
    tree = ET.fromstring(svg_content)
    
    # For simplicity, create a gradient PNG programmatically
    pixels = []
    
    for y in range(height):
        row = []
        for x in range(width):
            # Calculate distance from center
            cx, cy = width // 2, height // 2
            dx, dy = x - cx, y - cy
            dist = sqrt(dx*dx + dy*dy)
            
            # Create gradient background
            if dist <= width // 2 - 2:
                # Gradient from purple to blue
                ratio = (dist + width//2) / width
                r = int(102 + (118 - 102) * ratio)
                g = int(126 + (75 - 126) * ratio)
                b = int(234 + (162 - 234) * ratio)
                row.append((r, g, b, 255))
            else:
                row.append((255, 255, 255, 0))  # Transparent
        
        pixels.append(row)
    
    # Add white eye symbol in center
    import math
    for angle in range(0, 360, 5):
        for r in range(15, 35):
            ex = int(cx + r * math.cos(math.radians(angle)))
            ey = int(cy + r * math.sin(math.radians(angle)) * 0.6)  # Elliptical
            
            if 0 <= ex < width and 0 <= ey < height:
                # Check if within eye shape
                dist_from_center = sqrt((ex-cx)**2 + ((ey-cy)/0.6)**2)
                if 15 <= dist_from_center <= 35:
                    pixels[ey][ex] = (255, 255, 255, 255)
    
    # Inner circle
    for angle in range(0, 360):
        import math
        for r in range(0, 12):
            ex = int(cx + r * math.cos(math.radians(angle)))
            ey = int(cy + r * math.sin(math.radians(angle)))
            
            if 0 <= ex < width and 0 <= ey < height:
                if r <= 6:
                    pixels[ey][ex] = (102, 126, 234, 255)  # Purple center
                else:
                    pixels[ey][ex] = (255, 255, 255, 255)
    
    return encode_png(pixels)

def encode_png(pixels):
    """Encode pixel data to PNG format"""
    height = len(pixels)
    width = len(pixels[0]) if pixels else 0
    
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # Filter type: None
        for r, g, b, a in row:
            raw_data += bytes([r, g, b, a])
    
    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

# Read SVG
with open('/workspace/icons/icon.svg', 'r') as f:
    svg_content = f.read()

# Generate icons at different sizes
sizes = [16, 48, 128]

for size in sizes:
    png_data = create_png(size, size, svg_content)
    with open(f'/workspace/icons/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Generated icon{size}.png')

print('All icons generated successfully!')
