'use client';

import React, { useState, useTransition } from 'react';
import { User, Lock, Plus, Eye, EyeOff, Edit2, Trash2, ChevronDown, ChevronUp, Camera, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { updateProfileAction, updatePasswordAction, createFaqAction, deleteFaqAction, updateFaqAction } from '@/app/actions/settings';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface SettingsClientProps {
  initialFullName: string;
  initialEmail: string;
  initialAvatarInitials: string;
  initialFaqs: FaqItem[];
}

export function SettingsClient({
  initialFullName,
  initialEmail,
  initialAvatarInitials,
  initialFaqs,
}: SettingsClientProps) {
  // Profile State
  const [fullName, setFullName] = useState(initialFullName);
  const [emailAddress, setEmailAddress] = useState(initialEmail);
  const [profileToast, setProfileToast] = useState('');
  const [isProfilePending, startProfileTransition] = useTransition();

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [securityToast, setSecurityToast] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isSecurityPending, startSecurityTransition] = useTransition();

  // Help & Support FAQ State
  const [faqs, setFaqs] = useState<FaqItem[]>(initialFaqs);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(faqs[0]?.id || null);
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [isFaqPending, startFaqTransition] = useTransition();

  // Edit FAQ State
  const [showEditFaqModal, setShowEditFaqModal] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editFaqQuestion, setEditFaqQuestion] = useState('');
  const [editFaqAnswer, setEditFaqAnswer] = useState('');

  // Handlers
  const handleEditFaqClick = (faq: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFaqId(faq.id);
    setEditFaqQuestion(faq.question);
    setEditFaqAnswer(faq.answer);
    setShowEditFaqModal(true);
  };

  const handleUpdateFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFaqQuestion || !editFaqAnswer || !editingFaqId) return;

    startFaqTransition(async () => {
      const formData = new FormData();
      formData.append('id', editingFaqId);
      formData.append('question', editFaqQuestion);
      formData.append('answer', editFaqAnswer);

      const res = await updateFaqAction(formData);
      if (!res.error && res.data) {
        setFaqs(faqs.map(f => f.id === editingFaqId ? res.data as FaqItem : f));
        setShowEditFaqModal(false);
        setEditingFaqId(null);
        setEditFaqQuestion('');
        setEditFaqAnswer('');
      } else {
        alert(res.error);
      }
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startProfileTransition(async () => {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('emailAddress', emailAddress);

      const res = await updateProfileAction(formData);
      if (res.error) {
        setProfileToast(`Error: ${res.error}`);
      } else {
        setProfileToast('Profile changes saved successfully!');
      }
      setTimeout(() => setProfileToast(''), 3000);
    });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');

    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match!');
      return;
    }

    startSecurityTransition(async () => {
      const formData = new FormData();
      formData.append('newPassword', newPassword);

      const res = await updatePasswordAction(formData);
      if (res.error) {
        setSecurityError(res.error);
      } else {
        setSecurityToast('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSecurityToast(''), 3000);
      }
    });
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion || !newFaqAnswer) return;

    startFaqTransition(async () => {
      const formData = new FormData();
      formData.append('question', newFaqQuestion);
      formData.append('answer', newFaqAnswer);

      const res = await createFaqAction(formData);
      if (!res.error && res.data) {
        setFaqs([...faqs, res.data as FaqItem]);
        setShowAddFaqModal(false);
        setNewFaqQuestion('');
        setNewFaqAnswer('');
        setExpandedFaqId(res.data.id);
      } else {
        alert(res.error);
      }
    });
  };

  const handleDeleteFaq = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startFaqTransition(async () => {
      const res = await deleteFaqAction(id);
      if (!res.error) {
        setFaqs(faqs.filter((f) => f.id !== id));
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-4">
        <span className="text-xs text-slate-400 font-semibold block mb-0.5">Settings</span>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
      </header>

      <main className="flex-1 p-6 lg:p-8 space-y-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Profile Card */}
          <Card className="p-6 sm:p-8 border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Profile</h2>
            </div>

            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#0e2a47] text-white flex items-center justify-center text-lg font-bold shadow-md">
                  {initialAvatarInitials}
                </div>
                <button
                  type="button"
                  onClick={() => alert('Photo upload dialog')}
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center border-2 border-white text-xs hover:bg-slate-900 cursor-pointer"
                  title="Change avatar photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">{initialFullName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{initialEmail}</p>
                <span className="text-[11px] font-semibold text-slate-400 mt-0.5 block">Administrator</span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileToast && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${profileToast.startsWith('Error') ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                  {!profileToast.startsWith('Error') && <Check className="w-4 h-4 text-emerald-600" />}
                  <span>{profileToast}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isProfilePending}
                  icon={isProfilePending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : undefined}
                  className="bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold text-xs py-2.5 px-5 rounded-lg"
                >
                  {isProfilePending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Security Card */}
          <Card className="p-6 sm:p-8 border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Security</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {securityToast && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{securityToast}</span>
                </div>
              )}
              {securityError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <span>{securityError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSecurityPending}
                  icon={isSecurityPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : undefined}
                  className="bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold text-xs py-2.5 px-5 rounded-lg"
                >
                  {isSecurityPending ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Help & Support */}
        <Card className="p-6 sm:p-8 border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Help & Support</h2>
              <p className="text-xs text-slate-500 mt-0.5">Get answers to common questions or contact our support team.</p>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4 text-white" />}
              className="bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold text-xs px-4 py-2.5 rounded-lg self-start sm:self-auto"
              onClick={() => setShowAddFaqModal(true)}
            >
              Add FAQ
            </Button>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Frequently Asked Questions</h3>

            <div className="space-y-3">
              {faqs.length === 0 && (
                <p className="text-sm text-slate-500 py-4">No FAQs have been added yet.</p>
              )}
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden transition-all shadow-xs"
                  >
                    <div
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <span className="font-bold text-sm text-slate-900">{faq.question}</span>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleEditFaqClick(faq, e)}
                          className="text-teal-600 hover:text-teal-800 transition-colors p-1"
                          title="Edit FAQ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isFaqPending}
                          onClick={(e) => handleDeleteFaq(faq.id, e)}
                          className="text-rose-500 hover:text-rose-700 transition-colors p-1 disabled:opacity-50"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="text-slate-400 pl-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </main>

      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mb-6">Create a frequently asked question to help users.</p>

            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">FAQ</label>
                <input
                  type="text"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="Enter the question here.."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Answer</label>
                <textarea
                  rows={4}
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Provide a detailed answer.."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddFaqModal(false)}
                  disabled={isFaqPending}
                  className="w-1/3 py-2.5 rounded-xl text-slate-700 border-slate-300 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isFaqPending}
                  icon={isFaqPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : undefined}
                  className="w-2/3 py-2.5 rounded-xl bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold shadow-sm"
                >
                  {isFaqPending ? 'Saving...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditFaqModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Edit FAQ</h2>
            <p className="text-xs text-slate-500 mb-6">Update the question or answer.</p>

            <form onSubmit={handleUpdateFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">FAQ</label>
                <input
                  type="text"
                  value={editFaqQuestion}
                  onChange={(e) => setEditFaqQuestion(e.target.value)}
                  placeholder="Enter the question here.."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Answer</label>
                <textarea
                  rows={4}
                  value={editFaqAnswer}
                  onChange={(e) => setEditFaqAnswer(e.target.value)}
                  placeholder="Provide a detailed answer.."
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e2a47]"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowEditFaqModal(false)}
                  disabled={isFaqPending}
                  className="w-1/3 py-2.5 rounded-xl text-slate-700 border-slate-300 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isFaqPending}
                  icon={isFaqPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : undefined}
                  className="w-2/3 py-2.5 rounded-xl bg-[#0e2a47] hover:bg-[#0a1e33] text-white font-semibold shadow-sm"
                >
                  {isFaqPending ? 'Saving...' : 'Update'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
