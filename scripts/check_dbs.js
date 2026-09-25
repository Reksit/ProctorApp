const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabases() {
  const baseUri = process.env.MONGO_URI || '';
  
  // Create URIs for both databases
  const uriTest = baseUri.replace(/\/[^/=?]+(\?|$)/, '/proctorapptest$1');
  const uriProd = baseUri.replace(/\/[^/=?]+(\?|$)/, '/proctorapp$1');

  console.log('--- CHECKING proctorapptest ---');
  try {
    const conn1 = await mongoose.createConnection(uriTest).asPromise();
    const quizCount1 = await conn1.collection('quizzes').countDocuments();
    const userCount1 = await conn1.collection('users').countDocuments();
    const quizzes1 = await conn1.collection('quizzes').find({}).toArray();
    console.log(`proctorapptest -> Users: ${userCount1}, Quizzes: ${quizCount1}`);
    quizzes1.forEach(q => console.log(` - Quiz: "${q.title}" (Date: ${q.assignedDate})`));
    await conn1.close();
  } catch (err) {
    console.error('Error proctorapptest:', err.message);
  }

  console.log('\n--- CHECKING proctorapp ---');
  try {
    const conn2 = await mongoose.createConnection(uriProd).asPromise();
    const quizCount2 = await conn2.collection('quizzes').countDocuments();
    const userCount2 = await conn2.collection('users').countDocuments();
    const quizzes2 = await conn2.collection('quizzes').find({}).toArray();
    console.log(`proctorapp -> Users: ${userCount2}, Quizzes: ${quizCount2}`);
    quizzes2.forEach(q => console.log(` - Quiz: "${q.title}" (Date: ${q.assignedDate})`));
    await conn2.close();
  } catch (err) {
    console.error('Error proctorapp:', err.message);
  }

  process.exit(0);
}

checkDatabases();
