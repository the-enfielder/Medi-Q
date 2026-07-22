export async function sendNotification(phone: string, message: string) {
  // In a real application, you would integrate Twilio or an SMS gateway here.
  // For this prototype, we will log it to the console with a clear format.
  console.log('\n----------------------------------------');
  console.log(`📱 SMS SENT TO: ${phone}`);
  console.log(`✉️  MESSAGE: ${message}`);
  console.log('----------------------------------------\n');
}
