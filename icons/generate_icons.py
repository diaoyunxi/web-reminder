#!/usr/bin/env python3
"""
Icon generator for Web UI Change Detector Chrome Extension
Generates PNG icons from SVG at different sizes (16x16, 48x48, 128x128)
"""

import struct
import zlib
from pathlib import Path

def create_png(width, height):
    """Create a simple bell-icon PNG at the given size.

    Renders a hardcoded blue circle with white bell shape.
    For true SVG-to-PNG conversion, consider using PIL/Pillow or cairosvg.
    """

    def png_chunk(chunk_type, data):
        chunk_len = struct.pack(">I", len(data))
        chunk_crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # Create a simple blue gradient background with white bell icon
    pixels = []
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 2 - 2
    
    for y in range(height):
        row = []
        for x in range(width):
            # Calculate distance from center
            dx = x - center_x
            dy = y - center_y
            dist = (dx*dx + dy*dy) ** 0.5
            
            if dist <= radius:
                # Blue circle background
                r, g, b = 26, 115, 232  # #1a73e8
                
                # Add simple bell shape in white
                bell_height = radius * 0.6
                bell_width = radius * 0.5
                bell_top = center_y - bell_height / 2
                
                # Bell body (triangle-ish)
                if y > bell_top and y < center_y + radius * 0.3:
                    progress = (y - bell_top) / (bell_height * 0.8)
                    current_width = bell_width * (0.3 + 0.7 * min(progress, 1))
                    
                    if abs(x - center_x) < current_width:
                        r, g, b = 255, 255, 255  # White bell
                
                # Bell clapper (circle at bottom)
                clapper_y = center_y + radius * 0.2
                clapper_radius = radius * 0.15
                if (x - center_x)**2 + (y - clapper_y)**2 < clapper_radius**2:
                    r, g, b = 255, 255, 255
                
                # Bell top handle
                if y < bell_top and abs(x - center_x) < radius * 0.1 and y > bell_top - radius * 0.3:
                    r, g, b = 255, 255, 255
                    
                row.append((r, g, b))
            else:
                # Transparent background (will be white in PNG)
                row.append((255, 255, 255))
        pixels.append(row)
    
    # Build PNG file
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # Filter byte (none)
        for r, g, b in row:
            raw_data += bytes([r, g, b])
    
    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend


def main():
    # Get script directory
    script_dir = Path(__file__).resolve().parent
    icons_dir = script_dir
    
    print(f"Generating icons in: {icons_dir}")
    
    # Generate icons at different sizes
    sizes = [16, 48, 128]
    
    for size in sizes:
        png_data = create_png(size, size)
        output_path = icons_dir / f'icon{size}.png'
        
        with open(output_path, 'wb') as f:
            f.write(png_data)
        
        print(f"✓ Generated {output_path.name} ({size}x{size})")
    
    print("\nAll icons generated successfully!")


if __name__ == '__main__':
    main()
