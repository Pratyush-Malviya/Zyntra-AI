const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const navStartStr = `<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">`;
const navStartIndex = content.indexOf(navStartStr);

if (navStartIndex !== -1) {
  const closeNavTag = '</nav>';
  const navEndIndex = content.indexOf(closeNavTag, navStartIndex) + closeNavTag.length;

  if (navEndIndex !== -1 && navEndIndex > navStartIndex) {
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
