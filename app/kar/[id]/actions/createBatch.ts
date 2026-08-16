'use server';

import { supabase } from '@/lib/supabaseClient';

export async function createBatch(formData: FormData) {
  // Hent felter fra skjemaet
  const batchName = formData.get('batchName') as string;
  const startDate = formData.get('startDate') as string;
  const karId = Number(formData.get('karId'));

  // Basic validering
  if (!batchName || !startDate || isNaN(karId)) {
    return { success: false, error: 'Ugyldige felter i skjemaet' };
  }

  // Supabase: tabellen heter "Batches" (stor B)
  const { data, error } = await supabase
    .from('Batches')
    .insert([
      {
        batchnavn: batchName,
        startdato: startDate,
        aktivt_kar: karId,
        status: 'Planlagt',
        batchstorrelse: null,
        og: null,
        fg: null,
        oppskrift: null,
        batchnummer: null,
      },
    ])
    .select();

  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
