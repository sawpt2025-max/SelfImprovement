"""One-off script to generate placeholder PWA icons (no external deps).
Draws a warm cream square with a simple brown circle (monkey-face placeholder).
Run: python3 gen_icons.py
"""
import struct
import zlib

CREAM = (250, 240, 224)
BROWN = (140, 100, 70)
EAR = (120, 84, 58)

def make_png(size, path):
    cx, cy = size / 2, size / 2
    face_r = size * 0.30
    ear_r = size * 0.10
    ear_offset = size * 0.28

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            color = CREAM
            # ears
            for ex in (cx - ear_offset, cx + ear_offset):
                if (px - ex) ** 2 + (py - (cy - ear_offset)) ** 2 <= ear_r ** 2:
                    color = EAR
            # face
            if (px - cx) ** 2 + (py - cy) ** 2 <= face_r ** 2:
                color = BROWN
            row += bytes(color)
        rows.append(bytes(row))

    raw = b''.join(b'\x00' + r for r in rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

    with open(path, 'wb') as f:
        f.write(png)

make_png(192, 'icon-192.png')
make_png(512, 'icon-512.png')
make_png(180, 'apple-touch-icon.png')
print('done')
