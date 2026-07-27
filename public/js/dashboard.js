document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authorized as student
  const user = checkAuth('student');
  if (!user) return;

  const totalQuizzesEl = document.getElementById('stat-total-quizzes');
  const avgScoreEl = document.getElementById('stat-avg-score');
  const securityEl = document.getElementById('stat-security-status');
  const tableBody = document.getElementById('attempts-table-body');

  // 1. Fetch Today's Quizzes
  async function loadActiveQuizzes() {
    const quizzesListEl = document.getElementById('active-quizzes-list');
    if (!quizzesListEl) return;

    try {
      const res = await fetch('/api/quizzes/today', {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          quizzesListEl.innerHTML = `
            <div class="quiz-banner-card glass">
              <div class="quiz-banner-content">
                <span class="quiz-tag">Info</span>
                <h3>No Exams Assigned Today</h3>
                <p>You are all caught up! Check back later when your proctor assigns a new quiz.</p>
              </div>
            </div>
          `;
          return;
        }
        const data = await res.json();
        throw new Error(data.message || 'Failed to check active quizzes');
      }

      const quizzes = await res.json();
      quizzesListEl.innerHTML = '';

      quizzes.forEach(quiz => {
        let actionBtnHtml = '';
        let descHtml = quiz.description || 'No description provided.';

        if (quiz.alreadyAttempted) {
          actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Exam Completed</button>`;
        } else if (quiz.isLocked) {
          actionBtnHtml = `<button class="btn-start-quiz btn-disabled" disabled>Exam Locked</button>`;
          descHtml = `<span style="color: var(--warning); font-weight:600;">Locked: ${quiz.lockReason}</span><br><br>${descHtml}`;
        } else {
          actionBtnHtml = `<button class="btn-start-quiz" onclick="window.location.href='/quiz.html?id=${quiz.id}'">Start Secure Exam</button>`;
        }

        quizzesListEl.innerHTML += `
          <div class="quiz-banner-card glass">
            <div class="quiz-banner-content">
              <span class="quiz-tag">Assigned Exam</span>
              <h3>${quiz.title}</h3>
              <p>${descHtml}</p>
              <div class="quiz-meta-info">
                <span>Time Limit: <strong>${quiz.timeLimit}</strong> mins</span>
                <span>Questions: <strong>${quiz.totalQuestions}</strong> questions</span>
              </div>
            </div>
            ${actionBtnHtml}
          </div>
        `;
      });

    } catch (err) {
      console.error(err);
      quizzesListEl.innerHTML = `
        <div class="quiz-banner-card glass">
          <div class="quiz-banner-content">
            <span class="quiz-tag" style="background:var(--danger-bg); border-color:var(--danger); color:var(--danger);">Error</span>
            <h3>Failed to load assigned quizzes</h3>
            <p>${err.message}</p>
          </div>
        </div>
      `;
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
        const accuracy = Math.round((attempt.score / attempt.totalQuestions) * 100);
        totalPercentage += accuracy;
        totalViolations += attempt.violationCount;
        
        if (attempt.status === 'terminated' || attempt.violationCount >= 3) {
          securityFlagged = true;
        }

        const dateFormatted = new Date(attempt.completedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const mins = Math.floor(attempt.timeTaken / 60);
        const secs = attempt.timeTaken % 60;
        const durationFormatted = `${mins}m ${secs}s`;

        const proctorStatus = attempt.status === 'terminated' 
          ? '<span class="status-badge violated">TERMINATED</span>'
          : attempt.violationCount > 0
            ? `<span class="status-badge violated">${attempt.violationCount} Violations</span>`
            : '<span class="status-badge clean">CLEARED</span>';

        const securityText = attempt.violationCount === 0 
          ? 'Secure' 
          : attempt.violationCount < 3 
            ? 'Warning Flag' 
            : 'Suspicious';
            
        const securityClass = attempt.violationCount === 0 
          ? 'color: var(--success); font-weight:600;' 
          : attempt.violationCount < 3 
            ? 'color: var(--warning); font-weight:600;' 
            : 'color: var(--danger); font-weight:600;';

        tableBody.innerHTML += `
          <tr>
            <td><strong>${attempt.quiz ? attempt.quiz.title : 'Deleted Quiz'}</strong></td>
            <td>${dateFormatted}</td>
            <td>${durationFormatted}</td>
            <td><strong>${attempt.score}/${attempt.totalQuestions}</strong> (${accuracy}%)</td>
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

  // Load dashboards details
  await loadActiveQuizzes();
  await loadHistory();
});
