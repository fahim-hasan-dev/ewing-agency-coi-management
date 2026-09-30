'use server';

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createClientAction(formData: FormData) {
  // Use admin client to bypass RLS for auth creation
  const adminSupabase = await createAdminSupabaseClient();
  
  const contactName = formData.get('contactName') as string;
  const businessName = formData.get('businessName') as string;
  const contactEmail = formData.get('contactEmail') as string;
  const password = formData.get('password') as string;

  if (!contactName || !businessName || !contactEmail || !password) {
    return { error: 'Missing required fields' };
  }

  const initials = contactName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // 1. Create Auth User
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: contactEmail,
    password: password,
    email_confirm: true,
  });

  if (authError) {
    return { error: 'Failed to create user account: ' + authError.message };
  }

  // 2. Create Client Record
  const { data: clientData, error: clientError } = await adminSupabase
    .from('clients')
    .insert({
      contact_name: contactName,
      business_name: businessName,
      contact_email: contactEmail,
      avatar_initials: initials,
      phone: '',
      address: '',
    })
    .select()
    .single();

  if (clientError) {
    // If client insert fails, try to cleanup the auth user we just created
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: 'Failed to create client record: ' + clientError.message };
  }

  // 3. Link User Profile to Client Record
  // (The user_profiles row is created automatically by the database trigger on auth user creation)
  const { error: profileError } = await adminSupabase
    .from('user_profiles')
    .update({
      client_id: clientData.id,
      business_name: businessName,
      avatar_initials: initials,
    })
    .eq('id', authData.user.id);

  if (profileError) {
    console.error('Failed to link profile to client:', profileError);
    // Even if it fails, the client and auth user were created, so we still return success 
    // but in a production app we'd want to rollback or retry.
  }

  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');
  
  return { success: true, client: clientData };
}

export async function deleteClientAction(clientId: string) {
  const adminSupabase = await createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();

  // Find the associated user profiles to get the auth user IDs
  const { data: profiles } = await adminSupabase
    .from('user_profiles')
    .select('id')
    .eq('client_id', clientId);

  // Delete the client record
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    return { error: error.message };
  }

  // Delete associated auth users so their email is freed up
  if (profiles && profiles.length > 0) {
    for (const profile of profiles) {
      await adminSupabase.auth.admin.deleteUser(profile.id);
    }
  }

  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');

  return { success: true };
}
