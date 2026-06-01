import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Role } from '../../lib/rbac';
import { Shield, UserPlus, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  orgId?: string;
  createdAt?: any;
}

const ROLES: Role[] = [
  'Org Admin', 'Sales Manager', 'Account Executive', 'SDR', 'Customer Success', 'Viewer', 'Integration User'
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach(doc => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users", error);
      showToast("Failed to fetch users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRoleChange = async (uid: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      showToast(`User role updated to ${newRole}`, "success");
    } catch (error) {
      console.error("Error updating role", error);
      showToast("Failed to update role.", "error");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border ${
          toast.type === 'success' ? 'bg-surface border-brand/30 text-brand' : 'bg-surface border-red-500/30 text-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : null}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand" />
            User & Role Management
          </h1>
          <p className="text-text-muted text-xs md:text-sm">Control access, assign territories, and manage permissions across the organization.</p>
        </div>
        <button className="bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Users className="w-5 h-5 text-text-muted" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Organization Members</h3>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Users...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <motion.tr key={u.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-bg-subtle transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'U')}&background=random`} alt="avatar" className="w-10 h-10 rounded-full border border-border" />
                        <div>
                          <div className="text-sm font-bold">{u.displayName || 'Unknown User'}</div>
                          <div className="text-[10px] text-text-muted font-mono">{u.uid.slice(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-muted">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.role || 'SDR'} 
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as Role)}
                        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-brand cursor-pointer"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">Active</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
