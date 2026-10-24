import type { UserAccount } from '../../domain/types';
import type { SignUpInput } from '../../state/AppContext';
import { cloudError, getSupabase } from './client';
import { profileToUser } from './mappers';

export async function getCloudProfile(userId: string): Promise<UserAccount> {
  const { data, error } = await getSupabase().from('knot_profiles').select('*').eq('id', userId).single();
  if (error) throw cloudError(error);
  return profileToUser(data);
}

export async function getCloudSessionUser(): Promise<UserAccount | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw cloudError(error);
  return data.session?.user ? getCloudProfile(data.session.user.id) : null;
}

export async function cloudSignUp(input: SignUpInput): Promise<UserAccount> {
  if (input.ageBand !== '18_plus') throw new Error('Production participation is currently adults-only. Public browsing remains available.');
  if (input.password.length < 12) throw new Error('Use at least 12 characters for your production password.');
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email.toLowerCase(), password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth`,
      data: {
        name: input.name.trim(), age_band: input.ageBand, role: input.role,
        area_locality_id: input.areaLocalityId, interests: input.interests,
      },
    },
  });
  if (error) throw cloudError(error);
  if (!data.user) throw new Error('Account creation did not return an identity.');
  if (!data.session) throw new Error('Account created. Confirm your email before signing in; no participation action has been completed.');
  return getCloudProfile(data.user.id);
}

export async function cloudSignIn(email: string, password: string): Promise<UserAccount> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.toLowerCase(), password });
  if (error) throw cloudError(error);
  if (!data.user) throw new Error('Sign in did not return an identity.');
  return getCloudProfile(data.user.id);
}

export async function cloudSignOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw cloudError(error);
}
