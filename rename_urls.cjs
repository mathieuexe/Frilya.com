const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'src'),
  path.join(__dirname, 'api')
];

const replacements = [
  { search: "'/dashboard", replace: "'/tableau-de-bord" },
  { search: '"/dashboard', replace: '"/tableau-de-bord' },
  { search: '`/dashboard', replace: '`/tableau-de-bord' },
  { search: "'/auth", replace: "'/connexion" },
  { search: '"/auth', replace: '"/connexion' },
  { search: '`/auth', replace: '`/connexion' },
  { search: "'/search", replace: "'/recherche" },
  { search: '"/search', replace: '"/recherche' },
  { search: '`/search', replace: '`/recherche' },
  { search: "'/checkout", replace: "'/paiement" },
  { search: '"/checkout', replace: '"/paiement' },
  { search: '`/checkout', replace: '`/paiement' },
  { search: "'/vendeur/onboarding", replace: "'/vendeur/inscription" },
  { search: '"/vendeur/onboarding', replace: '"/vendeur/inscription' },
  { search: '`/vendeur/onboarding', replace: '`/vendeur/inscription' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const rep of replacements) {
        if (content.includes(rep.search)) {
          content = content.split(rep.search).join(rep.replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

for (const dir of directories) {
  processDirectory(dir);
}
console.log('Done.');