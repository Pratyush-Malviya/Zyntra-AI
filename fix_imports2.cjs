const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find the bounds, handling \r\n and \n
const startRegex = /  getDocs,\r?\nimport React, \{ useState, useEffect, useRef, Component \} from 'react';/;
const endRegex = /\} from '\.\/firebase';\r?\nimport \{ UserManagement \} from '\.\/components\/admin\/UserManagement';\r?\n  UPDATE = 'update',/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
    const idx1 = startMatch.index;
    const idx2 = endMatch.index;
    
    if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
        const fixed = content.substring(0, idx1) + 
`  getDocs,
  Timestamp,
  deleteField,
  OAuthProvider,
  linkWithPopup,
  User 
} from './firebase';
import { UserManagement } from './components/admin/UserManagement';
import { RoleWorkspaceSelector } from './components/RoleWorkspaceSelector';
import { SidebarNav } from './components/SidebarNav';
import { Role, usePermission, FieldGuard } from './lib/rbac';

// --- Types ---
enum OperationType {
  CREATE = 'create',
` + content.substring(idx2 + endMatch[0].length - `  UPDATE = 'update',`.length);

        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log("Successfully fixed App.tsx imports!");
    } else {
        console.log("Could not find the exact bounds. idx1:", idx1, "idx2:", idx2);
    }
} else {
    console.log("Regex didn't match.");
}
