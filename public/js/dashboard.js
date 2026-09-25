document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authorized as student
  const user = checkAuth('student');
  if (!user) return;

  // --- STUDENT TABS NAVIGATION LOGIC ---
  // Wait a bit for navbar tabs to be created by utils.js
  await new Promise(resolve => setTimeout(resolve, 50));

  const tabDashboard = document.getElementById('tab-student-dashboard');
  const tabPerformance = document.getElementById('tab-student-performance');

  const panelDashboard = document.getElementById('panel-student-dashboard');
  const panelPerformance = document.getElementById('panel-student-performance');

  const tabs = [tabDashboard, tabPerformance];
  const panels = [panelDashboard, panelPerformance];

  tabs.forEach((tab, index) => {
    if (tab) {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        panels.forEach(p => {
          if (p) {
            p.classList.remove('active');
            p.style.display = 'none';
          }
        });

        if (panels[index]) {
          panels[index].classList.add('active');
          panels[index].style.display = 'block';
        }
      });
    }
  });

  const totalQuizzesEl = document.getElementById('stat-total-quizzes');
  const avgScoreEl = document.getElementById('stat-avg-score');
  const securityEl = document.getElementById('stat-security-status');
  const tableBody = document.getElementById('attempts-table-body');

  // Helper function to get today's date in YYYY-MM-DD format
  function getTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper function to format date for display
  function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Render quiz card
  function renderQuizCard(quiz, category = 'today') {
    let actionBtnHtml = '';
    let descHtml = quiz.description || 'No description provided.';
    let tagLabel = category === 'upcoming' ? 'Upcoming' : category === 'missed' ? 'Missed' : 'Available Today';
    let tagStyle = '';

    if (category === 'upcoming') {
      tagStyle = 'background:var(--warning-bg); border-color:var(--warning); color:var(--warning);';
    } else if (category === 'missed') {
      tagStyle = 'background:var(--danger-bg); border-color:var(--danger); color:var(--danger);';
    }

    // Show detailed date and time information for all tests
    const dateTimeInfo = `
      <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 3px solid ${category === 'missed' ? 'var(--danger)' : category === 'upcoming' ? 'var(--warning)' : 'var(--primary)'};">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-bottom: 0.5rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.85rem; display: block; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Test Date</span>
            <span style="color: var(--text); font-weight: 600; font-size: 0.95rem;">${formatDateDisplay(quiz.assigned_date)}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.85rem; display: block; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Time Limit</span>
            <span style="color: var(--text); font-weight: 600; font-size: 0.95rem;">${quiz.time_limit} minutes</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.85rem; display: block; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Start Time</span>
            <span style="color: var(--text); font-weight: 600; font-size: 0.95rem;">${quiz.start_time}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.85rem; display: block; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">End Time</span>
            <span style="color: var(--text); font-weight: 600; font-size: 0.95rem;">${quiz.end_time}</span>
          </div>
        </div>
        <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--border);">
          <span style="color: var(--text-muted); font-size: 0.85rem; display: inline-block; margin-right: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Questions</span>
          <span style="color: var(--primary); font-weight: 700; font-size: 1rem;">${quiz.total_questions}</span>
        </div>
      </div>
    `;

    if (quiz.alreadyAttempted) {
      actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Exam Completed</button>`;
    } else if (category === 'missed') {
      actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Missed</button>`;
      descHtml = `<span style="color: var(--danger); font-weight:600;">This test was not completed within the allowed time window.</span><br><br>${descHtml}`;
    } else if (quiz.isLocked && category === 'today') {
      actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Locked</button>`;
      descHtml = `<span style="color: var(--warning); font-weight:600;">Locked: ${quiz.lockReason}</span><br><br>${descHtml}`;
    } else if (category === 'upcoming') {
      actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Not Yet Available</button>`;
    } else {
      actionBtnHtml = `<button class="btn-start-quiz" onclick="window.location.href='/quiz.html?id=${quiz.id}'">Start Secure Exam</button>`;
    }

    return `
      <div class="quiz-banner-card glass">
        <div class="quiz-banner-content">
          <span class="quiz-tag" style="${tagStyle}">${tagLabel}</span>
          <h3>${quiz.title}</h3>
          ${dateTimeInfo}
          <p>${descHtml}</p>
        </div>
        ${actionBtnHtml}
      </div>
    `;
  }

  // Tab Navigation for Test Categories
  function setupTestTabs() {
    const tabButtons = document.querySelectorAll('.test-tab-btn');
    const tabContents = document.querySelectorAll('.test-tab-content');

    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => {
          c.classList.remove('active');
          c.style.display = 'none';
        });

        // Add active class to clicked tab and corresponding content
        btn.classList.add('active');
        tabContents[index].classList.add('active');
        tabContents[index].style.display = 'block';
      });
    });
  }

  // 1. Fetch and Display Quizzes (Today's, Upcoming, and Missed)
  async function loadActiveQuizzes() {
    const todayListEl = document.getElementById('today-quizzes-list');
    const upcomingListEl = document.getElementById('upcoming-quizzes-list');
    const missedListEl = document.getElementById('missed-quizzes-list');

    if (!todayListEl || !upcomingListEl || !missedListEl) return;

    try {
      const res = await fetch('/api/quizzes/today', {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        if (res.status === 404) {
          todayListEl.innerHTML = `
            <div class="quiz-banner-card glass">
              <div class="quiz-banner-content">
                <span class="quiz-tag">Info</span>
                <h3>No Active Quizzes</h3>
                <p>No quizzes are currently available. Check back later!</p>
              </div>
            </div>
          `;
          upcomingListEl.innerHTML = `
            <div class="quiz-banner-card glass">
              <div class="quiz-banner-content">
                <span class="quiz-tag">Info</span>
                <h3>No Upcoming Tests</h3>
                <p>No tests scheduled for future dates.</p>
              </div>
            </div>
          `;
          missedListEl.innerHTML = `
            <div class="quiz-banner-card glass">
              <div class="quiz-banner-content">
                <span class="quiz-tag">Info</span>
                <h3>No Missed Tests</h3>
                <p>You haven't missed any tests.</p>
              </div>
            </div>
          `;
          return;
        }
        const data = await res.json();
        throw new Error(data.message || 'Failed to check active quizzes');
      }

      const allQuizzes = await res.json();
      const todayStr = getTodayDate();

      // Get current time in HH:MM format
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Separate quizzes into today, upcoming, and missed
      const todayQuizzes = allQuizzes.filter(q => {
        if (q.assigned_date !== todayStr) return false;
        // Exclude if already attempted
        if (q.alreadyAttempted) return false;
        // Exclude if end time has passed (those go to missed)
        if (currentTimeStr > q.end_time) return false;
        return true;
      });

      const upcomingQuizzes = allQuizzes.filter(q => q.assigned_date > todayStr);

      const missedQuizzes = allQuizzes.filter(q => {
        // Already attempted tests are not missed
        if (q.alreadyAttempted) return false;

        // Past date tests that weren't attempted
        if (q.assigned_date < todayStr) return true;

        // Today's tests where end time has passed
        if (q.assigned_date === todayStr && currentTimeStr > q.end_time) return true;

        return false;
      });

      // Render Today's Quizzes
      if (todayQuizzes.length === 0) {
        todayListEl.innerHTML = `
          <div class="quiz-banner-card glass">
            <div class="quiz-banner-content">
              <span class="quiz-tag">Info</span>
              <h3>No Tests Assigned Today</h3>
              <p>You are all caught up! Check upcoming tests or return when your proctor assigns a new quiz.</p>
            </div>
          </div>
        `;
      } else {
        todayListEl.innerHTML = todayQuizzes.map(quiz => renderQuizCard(quiz, 'today')).join('');
      }

      // Render Upcoming Quizzes
      if (upcomingQuizzes.length === 0) {
        upcomingListEl.innerHTML = `
          <div class="quiz-banner-card glass">
            <div class="quiz-banner-content">
              <span class="quiz-tag">Info</span>
              <h3>No Upcoming Tests</h3>
              <p>No tests scheduled for future dates at this time.</p>
            </div>
          </div>
        `;
      } else {
        upcomingListEl.innerHTML = upcomingQuizzes.map(quiz => renderQuizCard(quiz, 'upcoming')).join('');
      }

      // Render Missed Quizzes
      if (missedQuizzes.length === 0) {
        missedListEl.innerHTML = `
          <div class="quiz-banner-card glass">
            <div class="quiz-banner-content">
              <span class="quiz-tag" style="background:var(--success-bg); border-color:var(--success); color:var(--success);">All Clear</span>
              <h3>No Missed Tests</h3>
              <p>You haven't missed any tests. All tests have been completed on time.</p>
            </div>
          </div>
        `;
      } else {
        missedListEl.innerHTML = missedQuizzes.map(quiz => renderQuizCard(quiz, 'missed')).join('');
      }

    } catch (err) {
      console.error(err);
      todayListEl.innerHTML = `
        <div class="quiz-banner-card glass">
          <div class="quiz-banner-content">
            <span class="quiz-tag" style="background:var(--danger-bg); border-color:var(--danger); color:var(--danger);">Error</span>
            <h3>Failed to load quizzes</h3>
            <p>${err.message}</p>
          </div>
        </div>
      `;
      upcomingListEl.innerHTML = '';
      missedListEl.innerHTML = '';
    }
  }

  // 2. Fetch Historical Attempts
  async function loadHistory() {
    try {
      const res = await fetch('/api/student/attempts', {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Failed to load attempt logs');
      const attempts = await res.json();

      totalQuizzesEl.textContent = attempts.length;

      if (attempts.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No exam attempts logged yet.</td>
          </tr>
        `;
        if (avgScoreEl) avgScoreEl.textContent = '0%';
        if (securityEl) {
          securityEl.textContent = 'Secure';
          securityEl.style.color = 'var(--success)';
        }
        return;
      }

      // Calculate Stats
      let totalPercentage = 0;
      let totalViolations = 0;
      let securityFlagged = false;

      tableBody.innerHTML = '';
      attempts.forEach(attempt => {
        const accuracy = Math.round((attempt.score / attempt.total_questions) * 100);
        totalPercentage += accuracy;
        totalViolations += attempt.violation_count;

        if (attempt.status === 'terminated' || attempt.violation_count >= 3) {
          securityFlagged = true;
        }

        const dateFormatted = new Date(attempt.completed_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const mins = Math.floor(attempt.time_taken / 60);
        const secs = attempt.time_taken % 60;
        const durationFormatted = `${mins}m ${secs}s`;

        const proctorStatus = attempt.status === 'terminated'
          ? '<span class="status-badge violated">TERMINATED</span>'
          : attempt.violation_count > 0
            ? `<span class="status-badge violated">${attempt.violation_count} Violations</span>`
            : '<span class="status-badge clean">CLEARED</span>';

        const securityText = attempt.violation_count === 0
          ? 'Secure'
          : attempt.violation_count < 3
            ? 'Warning Flag'
            : 'Suspicious';

        const securityClass = attempt.violation_count === 0
          ? 'color: var(--success); font-weight:600;'
          : attempt.violation_count < 3
            ? 'color: var(--warning); font-weight:600;'
            : 'color: var(--danger); font-weight:600;';

        tableBody.innerHTML += `
          <tr>
            <td><strong>${attempt.quizzes ? attempt.quizzes.title : 'Deleted Quiz'}</strong></td>
            <td>${dateFormatted}</td>
            <td>${durationFormatted}</td>
            <td><strong>${attempt.score}/${attempt.total_questions}</strong> (${accuracy}%)</td>
            <td style="${securityClass}">${securityText}</td>
            <td>${proctorStatus}</td>
          </tr>
        `;
      });

      // Update header cards
      const avgAccuracy = Math.round(totalPercentage / attempts.length);
      if (avgScoreEl) avgScoreEl.textContent = `${avgAccuracy}%`;

      if (securityEl) {
        if (securityFlagged) {
          securityEl.textContent = 'Suspicious';
          securityEl.style.color = 'var(--danger)';
        } else if (totalViolations > 0) {
          securityEl.textContent = 'Warning Flag';
          securityEl.style.color = 'var(--warning)';
        } else {
          securityEl.textContent = 'Secure';
          securityEl.style.color = 'var(--success)';
        }
      }

    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem;">Error loading history: ${err.message}</td>
        </tr>
      `;
    }
  }

  // Setup test category tabs
  setupTestTabs();

  // Load dashboards details
  await loadActiveQuizzes();
  await loadHistory();
});
