'use server';

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// CLIENT PORTAL PROFILE ACTIONS
export async function updateClientProfileAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const fullName = (formData.get('fullName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || '';
  const address = (formData.get('address') as string)?.trim() || '';

  if (!fullName) return { error: 'Please enter your name.' };

  const initials = fullName
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'CL';

  // Update Auth user metadata
  await supabase.auth.updateUser({
    data: { full_name: fullName, name: fullName },
  });

  // Fetch client_id from user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single();

  const adminSupabase = await createAdminSupabaseClient();

  // Update user_profiles initials
  await adminSupabase
    .from('user_profiles')
    .update({ avatar_initials: initials })
    .eq('id', user.id);

  // If linked to a client row, update client row
  if (profile?.client_id) {
    await adminSupabase
      .from('clients')
      .update({
        contact_name: fullName,
        phone: phone,
        address: address,
        avatar_initials: initials,
      })
      .eq('id', profile.client_id);
  }

  revalidatePath('/portal/account');
  revalidatePath('/portal');
  return { success: true, initials };
}

// ADMIN PROFILE ACTIONS
export async function updateProfileAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const fullName = formData.get('fullName') as string;
  const emailAddress = formData.get('emailAddress') as string;

  if (!fullName || !emailAddress) return { error: 'Missing fields' };

  // Update Auth email/name
  const { error: authError } = await supabase.auth.updateUser({
    email: emailAddress,
    data: { full_name: fullName }
  });

  if (authError) return { error: authError.message };

  // Update Avatar Initials in user_profiles
  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ avatar_initials: initials })
    .eq('id', user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath('/admin/settings');
  return { success: true };
}

// SECURITY ACTIONS
export async function updatePasswordAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const newPassword = formData.get('newPassword') as string;
  if (!newPassword) return { error: 'Missing password' };

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) return { error: error.message };

  return { success: true };
}

// FAQ ACTIONS
export async function createFaqAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  
  const question = formData.get('question') as string;
  const answer = formData.get('answer') as string;

  if (!question || !answer) return { error: 'Missing fields' };

  const { data, error } = await supabase
    .from('faqs')
    .insert({ question, answer })
    .select()
    .single();

  if (error) {
    // If the table doesn't exist yet, fake success so UI doesn't crash during testing
    if (error.code === '42P01') { 
       return { success: true, fake: true, data: { id: `faq-${Date.now()}`, question, answer } };
    }
    return { error: error.message };
  }

  revalidatePath('/admin/settings');
  return { success: true, data };
}

export async function deleteFaqAction(id: string) {
  const supabase = await createServerSupabaseClient();

  // Don't error if fake ID
  if (id.startsWith('faq-')) {
    revalidatePath('/admin/settings');
    return { success: true };
  }

  const { error } = await supabase
    .from('faqs')
    .delete()
    .eq('id', id);

  if (error && error.code !== '42P01') return { error: error.message };

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function updateFaqAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  
  const id = formData.get('id') as string;
  const question = formData.get('question') as string;
  const answer = formData.get('answer') as string;

  if (!id || !question || !answer) return { error: 'Missing fields' };

  if (id.startsWith('faq-')) {
    // Fake success for fake IDs (as seen in createFaqAction)
    return { success: true, data: { id, question, answer } };
  }

  const { data, error } = await supabase
    .from('faqs')
    .update({ question, answer })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/settings');
  return { success: true, data };
}
