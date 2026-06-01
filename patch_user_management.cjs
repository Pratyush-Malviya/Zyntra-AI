const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
const importStatement = `import { UserManagement } from './components/admin/UserManagement';\n`;
if (!content.includes('UserManagement')) {
  content = content.replace(
    `import { RoleWorkspaceSelector }`,
    importStatement + `import { RoleWorkspaceSelector }`
  );
}

// Find <main> ending or some place to insert the view
const targetStr = `{activeView === 'SETTINGS' && (`;
const insertPos = content.indexOf(targetStr);

if (insertPos !== -1) {
  const insertCode = `
          {activeView === 'TEAM_ADMIN' && (
            <UserManagement />
          )}
`;
  content = content.slice(0, insertPos) + insertCode + content.slice(insertPos);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added UserManagement to App.tsx');
} else {
  console.log('Failed to find SETTINGS view in App.tsx');
}
