const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  "import { SettingsApiKeysPanel } from './components/SettingsApiKeysPanel';",
  "import { SettingsHub } from './components/SettingsApiKeysPanel';"
);

const startIndex = code.indexOf("          {activeView === 'SETTINGS' && (");
const endIndexStr = "            </motion.div>\n          )}";
const endIndex = code.indexOf(endIndexStr, startIndex);

if (startIndex > -1 && endIndex > -1) {
  const newBlock = `          {activeView === 'SETTINGS' && (
            <SettingsHub 
              showToast={showToast}
              profile={profile!}
              emAccount={emAccount}
              liAccount={liAccount}
              crmAccount={crmAccount}
              smtpConfig={smtpConfig}
              setSmtpConfig={setSmtpConfig}
              isConnectingEm={isConnectingEm}
              isConnectingLi={isConnectingLi}
              handleConnectEmail={handleConnectEmail}
              handleDisconnectEmail={handleDisconnectEmail}
              handleConnectLinkedIn={handleConnectLinkedIn}
              handleDisconnectLinkedIn={handleDisconnectLinkedIn}
              generateProjectPDF={generateProjectPDF}
              leads={leads}
              handleDisconnectCRM={handleDisconnectCRM}
              handlePushCRMData={handlePushCRMData}
              isCrmPushing={isCrmPushing}
            />
          )}`;
  code = code.substring(0, startIndex) + newBlock + code.substring(endIndex + endIndexStr.length);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find start or end index");
}
