const axios = require('axios');

async function testSignup() {
  const randomStr = Math.random().toString(36).substring(7);
  const email = `testclinic_${randomStr}@example.com`;
  
  console.log(`Starting signup test with email: ${email}`);
  
  try {
    const response = await axios.post('http://localhost:3000/auth/signup', {
      email,
      password: 'StrongPassword123!',
      clinicName: `Apex Dental ${randomStr}`,
      timezone: 'America/New_York',
      specialty: 'Dentistry',
      city: 'New York',
      doctorName: 'Dr. Smith',
      doctorCredentials: 'DDS',
      doctorPhone: '+19998887777',
      businessHours: { mon: "09:00-17:00", tue: "09:00-17:00" },
      appointmentTypes: [{ name: "Consultation", duration: 30 }]
    });

    console.log('\n✅ Signup successful!');
    console.log(response.data);
  } catch (error) {
    console.error('\n❌ Signup failed!');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testSignup();
