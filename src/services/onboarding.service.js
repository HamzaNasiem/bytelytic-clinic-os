const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../db/client');
const env = require('../config/env');
const phonenumberService = require('./phonenumber.service');
const voiceService = require('./voice.service');
const emailService = require('./email.service');

class OnboardingService {
  /**
   * Main orchestrator for clinic self-service onboarding.
   * Runs the entire flow and rolls back if any step fails.
   */
  async processSignup({
    email,
    password,
    clinicName,
    timezone,
    specialty,
    city,
    doctorName,
    doctorCredentials,
    doctorPhone,
    businessHours,
    appointmentTypes
  }) {
    console.log(`[OnboardingService] Starting provisioning for ${clinicName} (${email})...`);
    
    // Admin client is required to delete users if rollback happens
    const adminClient = createClient(env.supabaseUrl, env.supabaseServiceKey);
    let authUser = null;
    let clinicRow = null;

    try {
      // 1. Create Auth User
      console.log(`[OnboardingService] Step 1: Creating Auth User...`);
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for now, or respect standard flow
      });

      if (authErr) {
        if (authErr.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw new Error(`Auth failed: ${authErr.message}`);
      }
      authUser = authData.user;

      // 2. Insert Clinic Row
      console.log(`[OnboardingService] Step 2: Creating Database Row...`);
      const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .insert({
          name: clinicName,
          owner_email: email,
          timezone: timezone || 'America/Chicago',
          specialty: specialty || null,
          city: city || null,
          primary_doctor_name: doctorName || null,
          primary_doctor_credentials: doctorCredentials || null,
          primary_doctor_phone: doctorPhone || null,
          business_hours: businessHours || { "mon": "08:00-18:00", "tue": "08:00-18:00", "wed": "08:00-18:00", "thu": "08:00-18:00", "fri": "08:00-18:00" },
          appointment_types: appointmentTypes || [{ name: "General Checkup", duration: 30 }],
          is_active: true,
        })
        .select()
        .single();

      if (clinicErr) throw new Error(`Database insert failed: ${clinicErr.message}`);
      clinicRow = clinic;

      // 3. Assign Twilio Number
      console.log(`[OnboardingService] Step 3: Assigning Twilio Number...`);
      const assignedPhone = await phonenumberService.assignNumberToClinic(clinicRow.id);
      
      await supabase
        .from('clinics')
        .update({ phone_number: assignedPhone, twilio_number: assignedPhone })
        .eq('id', clinicRow.id);

      // 4. Create Retell Agent
      console.log(`[OnboardingService] Step 4: Creating Retell Agent...`);
      const agentResult = await voiceService.createAgent(clinicRow.id);
      if (!agentResult.success) {
        throw new Error(`Retell AI creation failed: ${agentResult.error}`);
      }

      // Fetch the updated clinic row with phone and agent info
      const { data: finalizedClinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicRow.id)
        .single();

      // 5. Send Welcome Email (Non-blocking)
      console.log(`[OnboardingService] Step 5: Sending Welcome Email...`);
      await emailService.sendWelcomeEmail(finalizedClinic, password);

      console.log(`[OnboardingService] Provisioning complete for ${clinicName}!`);

      // For standard auth, we can just return the user session logic or signal success
      // If we used admin to create, the user still needs to log in to get a session
      // We will generate a sign-in token so the frontend doesn't have to re-auth immediately
      const { data: sessionData } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });

      return {
        success: true,
        token: sessionData?.session?.access_token || null,
        clinicId: finalizedClinic.id,
        clinicName: finalizedClinic.name,
        timezone: finalizedClinic.timezone,
        phoneNumber: finalizedClinic.phone_number,
        message: 'Signup successful! AI Agent Provisioned.'
      };

    } catch (error) {
      console.error(`[OnboardingService] Provisioning failed:`, error.message);
      
      // Rollback logic
      console.log(`[OnboardingService] Initiating rollback...`);
      if (clinicRow) {
        await phonenumberService.releaseNumber(clinicRow.id).catch(console.error);
        await supabase.from('clinics').delete().eq('id', clinicRow.id).catch(console.error);
      }
      if (authUser) {
        await adminClient.auth.admin.deleteUser(authUser.id).catch(console.error);
      }

      throw error;
    }
  }
}

module.exports = new OnboardingService();
