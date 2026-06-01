const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import
const importStatement = `import { SidebarNav } from './components/SidebarNav';\n`;
if (!content.includes('SidebarNav')) {
  content = content.replace(
    `import { RoleWorkspaceSelector }`,
    importStatement + `import { RoleWorkspaceSelector }`
  );
}

// Find <nav> start and its corresponding </nav>
const navStartStr = `<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">`;
const navStartIndex = content.indexOf(navStartStr);

if (navStartIndex !== -1) {
  // Find the end of this nav block
  let depth = 0;
  let navEndIndex = -1;
  const navTag = '<nav';
  const closeNavTag = '</nav>';

  let currentIndex = navStartIndex;
  while (currentIndex < content.length) {
    const nextNav = content.indexOf(navTag, currentIndex + 1);
    const nextClose = content.indexOf(closeNavTag, currentIndex);
    
    if (nextClose === -1) break; // Error

    if (nextNav !== -1 && nextNav < nextClose) {
      depth++;
      currentIndex = nextNav;
    } else {
      depth--;
      currentIndex = nextClose + closeNavTag.length;
      if (depth === 0) {
        navEndIndex = currentIndex;
        break;
      }
    }
  }

  if (navEndIndex !== -1) {
    const props = `
      <SidebarNav 
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isMenuCollapsed={isMenuCollapsed}
        activeRole={activeRole}
        setResearchKey={setResearchKey}
        setCurrentCampaign={setCurrentCampaign}
        setActivePanel={setActivePanel}
        currentCampaign={currentCampaign}
        campaigns={campaigns}
        leads={leads}
        messages={messages}
        generateProjectPDF={generateProjectPDF}
        showToast={showToast}
      />`;

    const before = content.substring(0, navStartIndex);
    const after = content.substring(navEndIndex);
    
    content = before + props + after;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched App.tsx nav section');
  } else {
    console.log('Failed to find closing </nav> tag');
  }
} else {
  console.log('Failed to find opening <nav> tag');
}
