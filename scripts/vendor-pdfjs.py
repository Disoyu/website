"""Refresh the pinned, self-hosted PDF.js distribution (Python standard library only)."""
import base64
import hashlib
import io
import json
import tarfile
import urllib.request
from pathlib import Path

VERSION = '6.5.438'
ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'public' / 'vendor' / 'pdfjs'
metadata_url = f'https://registry.npmjs.org/pdfjs-dist/{VERSION}'
with urllib.request.urlopen(metadata_url, timeout=30) as response:
    metadata = json.load(response)
with urllib.request.urlopen(metadata['dist']['tarball'], timeout=60) as response:
    payload = response.read()
integrity = 'sha512-' + base64.b64encode(hashlib.sha512(payload).digest()).decode()
if integrity != metadata['dist']['integrity']:
    raise RuntimeError('PDF.js package integrity verification failed')
selected_files = {'build/pdf.mjs', 'build/pdf.worker.mjs', 'web/pdf_viewer.mjs', 'web/pdf_viewer.css', 'LICENSE'}
count = 0
with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as archive:
    for member in archive.getmembers():
        name = member.name.removeprefix('package/')
        if name not in selected_files and not name.startswith(('cmaps/', 'standard_fonts/', 'wasm/', 'web/images/')):
            continue
        if not member.isfile():
            continue
        target = (DESTINATION / name).resolve()
        if not target.is_relative_to(DESTINATION.resolve()):
            raise RuntimeError('Invalid path in PDF.js package')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.extractfile(member).read())
        count += 1
DESTINATION.joinpath('VERSION.txt').write_text(f'PDF.js {VERSION}\nhttps://github.com/mozilla/pdf.js\nLicense: Apache-2.0 (see LICENSE)\nPackage integrity: {integrity}\n', encoding='utf8')
print(f'Verified and vendored PDF.js {VERSION}: {count} files')
