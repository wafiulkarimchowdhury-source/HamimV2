"""Builds www/index.html (the whole game in one file) from src/ and assets/.

Run from the repo root:  python3 tools/build.py
Edit the files in src/js, src/css and src/template.html, or swap the pictures in assets/, then run this.
Also writes build/artifact.html, a fragment used for the web preview.
"""
import base64
from pathlib import Path

root = Path(__file__).resolve().parent.parent


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode((root / path).read_bytes()).decode()


css = (root / "src" / "css" / "style.css").read_text(encoding="utf-8")
parts = [p.read_text(encoding="utf-8") for p in sorted((root / "src" / "js").glob("*.js"))]
imgs = f"var IMG_TARGET = '{data_uri('assets/target.png', 'image/png')}';\nvar IMG_BOSS = '{data_uri('assets/boss.png', 'image/png')}';\n"
js = "(function () {\n'use strict';\n" + imgs + "\n".join(parts) + "\n})();"

html = (root / "src" / "template.html").read_text(encoding="utf-8")
html = html.replace("/*__CSS__*/", css).replace("/*__JS__*/", js.replace("</script", "<\\/script"))

out = root / "www" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")
(root / "build").mkdir(exist_ok=True)
(root / "build" / "game.js").write_text(js, encoding="utf-8")
