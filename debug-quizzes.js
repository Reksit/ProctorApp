// Debug script to check quizzes
require('dotenv').config();
const supabase = require('./supabaseClient');

async function debugQuizzes() {
  console.log('=== DEBUGGING QUIZZES ===\n');

  // Current server date/time
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMins = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMins}`;

  console.log('Current Date (server):', todayStr);
  console.log('Current Time (server):', currentTimeStr);
  console.log('Current DateTime:', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('\n--- ALL QUIZZES IN DATABASE ---\n');

  // Fetch all quizzes
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quizzes:', error);
    return;
  }

  if (!quizzes || quizzes.length === 0) {
    console.log('❌ No quizzes found in database!');
    return;
  }

  console.log(`✅ Found ${quizzes.length} quiz(es):\n`);

  quizzes.forEach((quiz, index) => {
    console.log(`Quiz #${index + 1}:`);
    console.log('  ID:', quiz.id);
    console.log('  Title:', quiz.title);
    console.log('  Assigned Date:', quiz.assigned_date);
    console.log('  Start Time:', quiz.start_time);
    console.log('  End Time:', quiz.end_time);
    console.log('  Is Active:', quiz.is_active);
    console.log('  Questions:', quiz.questions.length);

    // Check if should be visible
    let shouldShow = true;
    let reason = '';

    if (!quiz.is_active) {
      shouldShow = false;
      reason = 'Quiz is NOT ACTIVE';
    } else if (quiz.assigned_date < todayStr) {
      shouldShow = false;
      reason = `Date expired (${quiz.assigned_date} < ${todayStr})`;
    } else if (quiz.assigned_date > todayStr) {
      shouldShow = true;
      reason = `Upcoming (${quiz.assigned_date} > ${todayStr})`;
    } else {
      // Today's quiz - check time
      if (currentTimeStr < quiz.start_time) {
        shouldShow = true;
        reason = `Locked - Not started yet (current: ${currentTimeStr}, starts: ${quiz.start_time})`;
      } else if (currentTimeStr > quiz.end_time) {
        shouldShow = true;
        reason = `Locked - Time expired (current: ${currentTimeStr}, ended: ${quiz.end_time})`;
      } else {
        shouldShow = true;
        reason = `✅ AVAILABLE NOW (${quiz.start_time} - ${quiz.end_time})`;
      }
    }

    console.log('  Should Show in Student Portal:', shouldShow ? '✅ YES' : '❌ NO');
    console.log('  Reason:', reason);
    console.log('');
  });

  process.exit(0);
}

debugQuizzes().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
