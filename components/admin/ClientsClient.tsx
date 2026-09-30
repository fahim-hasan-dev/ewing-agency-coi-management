'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, Plus, Eye, Trash2, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Avatar } from '@/components/shared/Avatar';
import { Card } from '@/components/shared/Card';
import { Client } from '@/types';
import { createClientAction, deleteClientAction } from '@/app/actions/clients';

interface ClientsClientProps {
  initialClients: Client[];
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const filteredClients = initialClients.filter(
    (c) =>
      c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('contactName', newClientName);
      formData.append('businessName', newClientName + ' LLC'); // Default business name
      formData.append('contactEmail', newClientEmail);
      formData.append('password', newClientPassword);

      const res = await createClientAction(formData);

      if (res.error) {
        setToastMessage(`Error: ${res.error}`);
      } else {
        setShowAddClientModal(false);
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPassword('');
        setToastMessage(`Client "${newClientName}" created successfully!`);
      }
      setTimeout(() => setToastMessage(''), 3000);
    });
  };

  const handleDeleteClient = (clientId: string, name: string) => {
    if (confirm(`Are you sure you want to delete client "${name}"? This cannot be undone.`)) {
      startTransition(async () => {
        const res = await deleteClientAction(clientId);
        if (res.error) {
          setToastMessage(`Error: ${res.error}`);
        } else {
          setToastMessage(`Client "${name}" has been deleted.`);
        }
        setTimeout(() => setToastMessage(''), 3000);
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Clients</h1>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4 text-white" />}
          className="bg-[#0e2a47] hover:bg-[#0a1e33] font-semibold"
          onClick={() => setShowAddClientModal(true)}
        >
          Add Client
        </Button>
      </header>

      {toastMessage && (
        <div className="fixed top-5 right-5 z-[60] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-xs font-semibold animate-bounce">
          {toastMessage}
        </div>
      )}

      <main className="flex-1 p-6 lg:p-8 space-y-6">
        <Card className="p-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47] transition-all"
            />
          </div>
        </Card>

        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Certs</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={client.avatarInitials} size="md" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{client.contactName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{client.businessName}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                      {client.contactEmail}
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                      {client.certificateCount}
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-xs font-normal">
                      {new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteClient(client.id, client.contactName)}
                          disabled={isPending}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {initialClients.length === 0 ? "No clients added yet." : `No clients found matching "${searchTerm}"`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add Client</h2>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@company.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newClientPassword}
                    onChange={(e) => setNewClientPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddClientModal(false)}
                  disabled={isPending}
                  className="w-1/3 py-2.5 rounded-xl text-slate-700 border-slate-300 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  icon={isPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : undefined}
                  className="w-2/3 py-2.5 rounded-xl bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold shadow-sm"
                >
                  {isPending ? 'Saving...' : 'Create Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
