import { spawnSync } from 'node:child_process';

// Read the existing credential in memory. Never log it or store it in the repository.
const result = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\nusername=guildcoder\n\n',
  encoding: 'utf8', windowsHide: true,
  env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' },
});
if (result.status !== 0) throw new Error('Sign in to Git as guildcoder first.');
const fields = Object.fromEntries(result.stdout.trim().split('\n').map(line => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
export async function github(path, method = 'GET', body) {
  const response = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: `Bearer ${fields.password}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) { const error = new Error(`GitHub ${response.status}: ${data.message}`); error.status = response.status; throw error; }
  return data;
}
const user = await github('/user');
if (user.login.toLowerCase() !== 'guildcoder') throw new Error('Only the personal guildcoder account is authorized.');
export const account = { login: user.login, plan: user.plan?.name };
