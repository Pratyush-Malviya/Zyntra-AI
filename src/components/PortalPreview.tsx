import React, { useState } from 'react';
import { Globe, ExternalLink, Eye, X, ChevronRight, Mail, Phone, Building, MapPin, Calendar, DollarSign, FileText, MessageSquare, Target } from 'lucide-react';

export function PortalPreview({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [showPortal, setShowPortal] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Customer Portal</h2>
          <p className="text-sm text-text-muted">Self-service portal for your customers</p>
        </div>
        <button onClick={() => setShowPortal(!showPortal)} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4" /> {showPortal ? 'Close Preview' : 'Preview Portal'}
        </button>
      </div>

      {showPortal && (
        <div className="bg-white rounded-xl border shadow-xl overflow-hidden">
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400 text-xs ml-2">Customer Portal Preview</span>
            </div>
            <button onClick={() => setShowPortal(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex min-h-[500px]">
            <div className="w-56 bg-gray-50 p-4 border-r hidden md:block">
              <div className="text-lg font-bold text-gray-800 mb-6">Zyntra</div>
              <nav className="space-y-1">
                {['Dashboard', 'Deals', 'Invoices', 'Support', 'Profile'].map(item => (
                  <button key={item} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${item === 'Dashboard' ? 'bg-brand/10 text-brand font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>{item}</button>
                ))}
              </nav>
            </div>

            <div className="flex-1 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Welcome back, Acme Corp</h3>
              <p className="text-sm text-gray-500 mb-6">Your partner since Jan 2026</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-brand/5 rounded-xl p-4 border border-brand/10">
                  <p className="text-xs text-gray-500">Active Deals</p>
                  <p className="text-2xl font-bold text-gray-800">4</p>
                  <p className="text-xs text-green-600">2 in negotiation</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs text-gray-500">Open Invoices</p>
                  <p className="text-2xl font-bold text-gray-800">$24,500</p>
                  <p className="text-xs text-red-600">1 overdue</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs text-gray-500">Support Tickets</p>
                  <p className="text-2xl font-bold text-gray-800">2</p>
                  <p className="text-xs text-yellow-600">1 awaiting response</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden mb-6">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                  <p className="font-medium text-gray-700 text-sm">Recent Deals</p>
                  <button className="text-xs text-brand">View all →</button>
                </div>
                {[
                  { name: 'Enterprise License Renewal', stage: 'Negotiation', value: '$36,000', status: 'hot' },
                  { name: 'Implementation Services', stage: 'Proposal', value: '$12,500', status: 'warm' },
                  { name: 'Add-on Modules', stage: 'Discovery', value: '$8,000', status: 'warm' },
                ].map((deal, i) => (
                  <div key={i} className="px-4 py-3 border-b last:border-b-0 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{deal.name}</p>
                      <p className="text-xs text-gray-500">{deal.stage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{deal.value}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${deal.status === 'hot' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{deal.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800 mb-1">Support Ticket #1423</p>
                <p className="text-xs text-amber-700">"API integration returning 403 errors" — Last updated 2h ago</p>
                <button className="mt-2 text-xs text-brand font-medium">View & reply →</button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-2 border-t text-center text-xs text-gray-400">
            Powered by Zyntra AI — Customer Portal (Preview)
          </div>
        </div>
      )}

      {!showPortal && (
        <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-30" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Customer Portal</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto mb-4">
            Give your customers a self-service dashboard to view their deals, invoices, support tickets, and account information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              { icon: Target, title: 'Deal Tracking', desc: 'Customers see real-time deal stages and values' },
              { icon: DollarSign, title: 'Billing & Invoices', desc: 'View and download invoices, track payments' },
              { icon: MessageSquare, title: 'Support Tickets', desc: 'Open and track support cases' },
            ].map((f, i) => (
              <div key={i} className="bg-bg-primary rounded-lg p-3 border border-border">
                <f.icon className="w-5 h-5 text-brand mb-1" />
                <p className="text-sm font-medium text-text-primary">{f.title}</p>
                <p className="text-xs text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
