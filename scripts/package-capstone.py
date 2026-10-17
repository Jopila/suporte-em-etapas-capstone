"""Empacota por lista permitida, confere hashes e testa uma cópia extraída sem chave."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/entrega'
OUT.mkdir(parents=True, exist_ok=True)
ARCHIVE = OUT / 'Suporte_em_Etapas_Capstone_v1.2.1.zip'
PDF = ROOT / 'output/pdf/Capstone_Suporte_em_Etapas.pdf'
def sha(data): return hashlib.sha256(data).hexdigest()
def dump(path, data): path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
assert PDF.is_file(), 'pdf_missing'
files = {}
for name in ['README.md', 'LEIA-ME-ENTREGA.md', 'package.json', '.env.example', '.gitignore', '.nvmrc']:
    files[name] = ROOT / name
for directory in ['src', 'prompts', 'tests', 'data', 'examples', 'docs', 'scripts', 'reports']:
    for path in sorted((ROOT / directory).rglob('*')):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if 'private' in relative.parts or '__pycache__' in relative.parts or path.suffix in {'.pyc', '.log'}:
            continue
        assert not path.is_symlink(), 'symlink_not_allowed'
        assert path.resolve().is_relative_to(ROOT), 'outside_workspace'
        files[relative.as_posix()] = path
files['Relatorio_Capstone.pdf'] = PDF

# Lê somente a chave deste projeto, em memória, para impedir inclusão acidental.
# Nenhum valor ou trecho da credencial é exibido ou salvo em relatórios.
secrets = set()
if os.environ.get('GROQ_API_KEY'):
    secrets.add(os.environ['GROQ_API_KEY'])
env_path = ROOT / '.env.local'
if env_path.exists():
    for line in env_path.read_text(encoding='utf-8-sig').splitlines():
        if re.match(r'^\s*GROQ_API_KEY\s*=', line):
            value = line.split('=', 1)[1].strip().strip('"\'')
            if len(value) > 20:
                secrets.add(value)

payload = {}
for name, path in sorted(files.items()):
    assert '.env.local' not in name and not (path.name.startswith('.env') and path.name != '.env.example'), 'env_file_not_allowed'
    data = path.read_bytes()
    assert all(secret.encode() not in data for secret in secrets), 'secret_detected_in_package'
    payload[name] = data
manifest = {'schema_version': 1, 'algorithm': 'SHA-256',
    'note': 'Hashes dos arquivos do pacote; este manifesto não inclui seu próprio hash.',
    'files': {name: {'sha256': sha(data), 'bytes': len(data)} for name, data in payload.items()}}
manifest_bytes = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
with ZipFile(ARCHIVE, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in payload.items():
        archive.writestr(name, data)
    archive.writestr('MANIFESTO_ARQUIVOS.json', manifest_bytes)

workspace_tmp = ROOT / 'tmp'
workspace_tmp.mkdir(exist_ok=True)
extracted = Path(tempfile.mkdtemp(prefix='entrega-verificacao-', dir=workspace_tmp)).resolve()
assert extracted.is_relative_to(workspace_tmp.resolve()), 'invalid_extract_destination'
with ZipFile(ARCHIVE) as archive:
    assert archive.testzip() is None, 'zip_crc_failed'
    assert len(archive.namelist()) == len(payload) + 1, 'zip_duplicate_members'
    for name in archive.namelist():
        target = (extracted / name).resolve()
        assert target.is_relative_to(extracted), 'unsafe_zip_path'
        assert not PurePosixPath(name).is_absolute(), 'absolute_zip_path'
        data = archive.read(name)
        if name != 'MANIFESTO_ARQUIVOS.json':
            assert sha(data) == manifest['files'][name]['sha256'], 'zip_hash_mismatch'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
assert not (extracted / '.env.local').exists()

# Confere links locais dos documentos ativos, não links de snapshots históricos.
checked_links = 0
for name in ['README.md', 'LEIA-ME-ENTREGA.md'] + [p.relative_to(extracted).as_posix() for p in (extracted / 'docs').glob('*.md')]:
    path = extracted / name
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
        if target.startswith(('https://', 'http://', '#', 'mailto:')):
            continue
        target = target.split('#', 1)[0].strip('<>')
        if target:
            assert (path.parent / target).exists(), f'broken_document_link:{name}:{target}'
            checked_links += 1

node = shutil.which('node')
assert node, 'node_required'
safe_env = {key: value for key, value in os.environ.items() if not key.startswith(('GROQ_', 'OPENAI_'))}
results = {}
def run(label, args):
    result = subprocess.run([node, *args], cwd=extracted, env=safe_env, capture_output=True, timeout=90)
    output = result.stdout + result.stderr
    assert all(secret.encode() not in output for secret in secrets), 'secret_detected_in_validation'
    (OUT / f'{label}.txt').write_bytes(output)
    assert result.returncode == 0, f'extracted_validation_failed:{label}'
    results[label] = {'exit_code': result.returncode, 'output_sha256': sha(output)}
    return result.stdout.decode('utf-8-sig')

tap = run('testes-pacote-extraido', ['--test', '--test-reporter=tap'])
assert re.search(r'^# pass 79$', tap, re.M) and re.search(r'^# fail 0$', tap, re.M)
demo = json.loads(run('demonstracao-pacote-extraido', ['src/cli.mjs', 'run', '--provider', 'demo', '--input', 'examples/chamado.json']))
assert demo['simulation'] is True and demo['status'] == 'rascunho_validado'
assert demo['requires_human_approval'] is True and demo['auto_sent'] is False
run('matriz-local-pacote-extraido', ['src/cli.mjs', 'evaluate', '--provider', 'demo', '--repeat', '3', '--output', 'tmp/qa-demo'])
local = json.loads((extracted / 'tmp/qa-demo.json').read_text(encoding='utf-8'))
assert local['passed'] == local['runs'] == 60 and local['simulation'] is True
run('auditoria-pacote-extraido', ['scripts/audit-capstone-delivery.mjs'])
# Remove somente a pasta temporária criada nesta execução, após conferir seu destino.
# Isso evita que node --test descubra outra cópia da suíte dentro de tmp/.
assert extracted.is_relative_to((ROOT / 'tmp').resolve()) and extracted.name.startswith('entrega-verificacao-'), 'unsafe_cleanup_path'
shutil.rmtree(extracted)
qa = {'generated_at': datetime.now(timezone.utc).isoformat(),
      'archive': ARCHIVE.name, 'archive_sha256': sha(ARCHIVE.read_bytes()), 'archive_bytes': ARCHIVE.stat().st_size,
      'files_in_archive': len(payload) + 1, 'all_member_hashes_verified': True,
      'local_document_links_verified': checked_links,
      'env_local_included': False, 'configured_key_scan_performed': bool(secrets), 'configured_key_found': False,
      'pdf_sha256': sha(PDF.read_bytes()), 'tests_passed_from_extracted_copy': 79,
      'simulation_passed_from_extracted_copy': 60, 'network_calls_in_validation': 0,
      'extraction_directory': str(extracted.relative_to(ROOT)),
      'extracted_copy_removed_after_validation': not extracted.exists(), 'commands': results}
dump(OUT / 'verificacao-da-entrega.json', qa)
(OUT / 'SHA256.txt').write_text(f"{qa['archive_sha256']}  {ARCHIVE.name}\n{qa['pdf_sha256']}  ../pdf/{PDF.name}\n", encoding='utf-8')
print(json.dumps(qa, ensure_ascii=True, indent=2))
