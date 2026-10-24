#!/usr/bin/env python3
"""Create EFI_RC2_OFFLINE.html for file:// browsers, from the modular source."""
from pathlib import Path
import re
import subprocess
root=Path(__file__).resolve().parents[1]
folder=root/'efi-intelligence'
s=(folder/'index.html').read_text()
css=(folder/'style.css').read_text()
parts=[]
for file in ('analyzer.mjs','fixtures.mjs','importer.mjs','app.mjs'):
    code=(folder/file).read_text()
    code=re.sub(r'^import .*?;\s*$', '', code,flags=re.M)
    code=re.sub(r'^export \{.*?\};\s*$', '', code,flags=re.M)
    code=re.sub(r'^export (const|class|function)\b', r'\1', code,flags=re.M)
    parts.append(code)
s=s.replace('<link rel="stylesheet" href="./style.css">',f'<style>\n{css}\n</style>')
s=s.replace('<link rel="manifest" href="../manifest.webmanifest">','')
s=s.replace('<script type="module" src="./app.mjs"></script>', '<script>\n'+'\n'.join(parts)+'\n</script>')
s=s.replace("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'\">",'')
# Validate the inline bundle before distributing it (prevents duplicate-const regressions).
script=s.split('<script>',1)[1].split('</script>',1)[0]
check=subprocess.run(['node','--check','-'],input=script,text=True,capture_output=True)
if check.returncode: raise RuntimeError('Bundle inválido: '+check.stderr)
(root/'EFI_RC2_OFFLINE.html').write_text(s)
print('Gerado: EFI_RC2_OFFLINE.html',len(s),'bytes, sintaxe validada')