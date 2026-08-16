'use server';

import { supabase } from '@/lib/supabaseClient';

export async function createBatch(formData: FormData) {
  const name = formData.get('name') as string;
  const volume = Number(formData.get('volume'));
  const status = formData.get('status') as string;

  const { data, error } = await supabase
    .from('batches')
    .insert([
      {
        name,
        volume_l: volume,
        status,
      },
    ]);

  if (error) {
    console.error(error);
    return { success: false, error };
  }

  return { success: true, data };
}
