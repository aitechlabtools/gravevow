# Junta actual/revision-*.json en actual/revision.js para que index.html se abra sin servidor.
import json, os
d = os.path.dirname(os.path.abspath(__file__))
r = {f: json.load(open(os.path.join(d, 'actual', f'revision-{f}.json'))) for f in ['escritorio', 'tableta', 'movil']}
open(os.path.join(d, 'actual', 'revision.js'), 'w').write('window.REVISION = ' + json.dumps(r) + ';\n')
