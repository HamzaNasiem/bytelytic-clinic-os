const { supabase } = require('../db/client');

/**
 * PhonumberService handles Twilio number provisioning for new clinics.
 * It uses a pre-purchased pool of numbers stored in the `phone_pool` table.
 */
class PhoneNumberService {
  /**
   * Assigns an available Twilio number from the pool to a clinic.
   * 
   * @param {string} clinicId 
   * @returns {Promise<string>} The assigned phone number
   */
  async assignNumberToClinic(clinicId) {
    try {
      // 1. Find an available number
      const { data: availableNumbers, error: fetchErr } = await supabase
        .from('phone_pool')
        .select('*')
        .eq('is_assigned', false)
        .limit(1);

      if (fetchErr) throw fetchErr;
      
      if (!availableNumbers || availableNumbers.length === 0) {
        throw new Error('No Twilio numbers available in the pool. Please add more numbers.');
      }

      const selectedNumber = availableNumbers[0];

      // 2. Mark it as assigned to this clinic
      const { data: updated, error: updateErr } = await supabase
        .from('phone_pool')
        .update({
          is_assigned: true,
          assigned_to: clinicId,
          assigned_at: new Date().toISOString()
        })
        .eq('id', selectedNumber.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return updated.phone_number;

    } catch (error) {
      console.error('[PhoneNumberService] Error assigning number:', error);
      throw error;
    }
  }

  /**
   * Returns a number to the pool (used if onboarding fails or clinic cancels)
   */
  async releaseNumber(clinicId) {
    try {
      const { error } = await supabase
        .from('phone_pool')
        .update({
          is_assigned: false,
          assigned_to: null,
          assigned_at: null
        })
        .eq('assigned_to', clinicId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[PhoneNumberService] Error releasing number:', error);
      throw error;
    }
  }
}

module.exports = new PhoneNumberService();
