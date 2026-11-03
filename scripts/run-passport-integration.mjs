import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'backend/integration-tests');
await mkdir(output, { recursive: true });
const rulesPath = process.env.PASSPORT_RULES_FILE || join(root, 'firestore.rules');
const rules = await readFile(rulesPath, 'utf8');
await writeFile(join(output, 'firestore.rules'), rules);
await writeFile(join(output, 'firebase.json'), JSON.stringify({ firestore: { rules: 'firestore.rules' }, emulators: { firestore: { host: '127.0.0.1', port: 8085 }, ui: { enabled: false }, singleProjectMode: true } }, null, 2));
const env = { ...process.env, PASSPORT_RULES_FILE: rulesPath, FIREBASE_EMULATORS_PATH: join(root, 'backend/integration-tools/emulators'), CI: 'true', XDG_CONFIG_HOME: join(root, 'backend/integration-tools/config'), FIREBASE_CLI_DISABLE_TELEMETRY: 'true' };
if (process.platform === 'win32' && !env.JAVA_HOME) {
  const javaRoot = join(root, 'backend/integration-tools/java21');
  const javaFolder = (await readdir(javaRoot)).find(name => name.startsWith('jdk-'));
  if (!javaFolder) throw new Error('請先設定 Java 21 或更新版本的 JAVA_HOME。');
  env.JAVA_HOME = join(javaRoot, javaFolder);
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = `${join(env.JAVA_HOME, 'bin')}${delimiter}${env[pathKey] || ''}`;
}
const command = process.env.PASSPORT_INTEGRATION_COMMAND || 'node --test --test-concurrency=1 tests/passportIntegration.test.mjs tests/productionRulesCompatibility.test.mjs';
const child = spawn(process.execPath, [join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only', 'firestore', '--project', 'demo-handbook-integration', '--config', join(output, 'firebase.json'), command], { cwd: root, env, stdio: 'inherit' });
child.on('error', error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
