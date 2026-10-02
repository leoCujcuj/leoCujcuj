const fs = require('fs');
const path = require('path');

async function updateLanguages() {
  const username = 'leoCujcuj';
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'User-Agent': 'GitHub-Action-Languages-Update'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
  if (!reposRes.ok) {
    throw new Error(`Failed to fetch repos: ${reposRes.status} ${reposRes.statusText}`);
  }
  const repos = await reposRes.json();
  const nonForks = repos.filter(r => !r.fork);

  const langTotals = {};
  for (const repo of nonForks) {
    try {
      const lRes = await fetch(repo.languages_url, { headers });
      if (lRes.ok) {
        const langs = await lRes.json();
        for (const [lang, bytes] of Object.entries(langs)) {
          langTotals[lang] = (langTotals[lang] || 0) + bytes;
        }
      }
    } catch (err) {
      console.error(`Error fetching languages for ${repo.name}:`, err.message);
    }
  }

  const totalBytes = Object.values(langTotals).reduce((a, b) => a + b, 0);
  if (totalBytes === 0) {
    console.log('No language data found.');
    return;
  }

  const sorted = Object.entries(langTotals).sort((a, b) => b[1] - a[1]);
  const barLength = 20;

  let textBlock = '> Languages (Repositories breakdown):\n';
  for (const [lang, bytes] of sorted.slice(0, 5)) {
    const pct = (bytes / totalBytes) * 100;
    const filled = Math.round((pct / 100) * barLength);
    const empty = Math.max(0, barLength - filled);
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    textBlock += `${lang.padEnd(20)}${bar}   ${pct.toFixed(2).padStart(5)}%\n`;
  }
  textBlock = textBlock.trimEnd();

  const readmePath = path.join(__dirname, '..', '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  const startMarker = '<!--START_SECTION:languages-->';
  const endMarker = '<!--END_SECTION:languages-->';

  const startIndex = readmeContent.indexOf(startMarker);
  const endIndex = readmeContent.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found in README.md');
    return;
  }

  const newSection = `${startMarker}\n\`\`\`text\n${textBlock}\n\`\`\`\n${endMarker}`;
  const updatedReadme = readmeContent.substring(0, startIndex) + newSection + readmeContent.substring(endIndex + endMarker.length);

  fs.writeFileSync(readmePath, updatedReadme, 'utf8');
  console.log('README.md languages section updated successfully!');
}

updateLanguages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
