document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authorized as admin
  const user = checkAuth('admin');
  if (!user) return;

  const attemptsTableBody = document.getElementById('admin-attempts-table-body');
  const totalAttemptsEl = document.getElementById('admin-stat-attempts');
  const avgAccuracyEl = document.getElementById('admin-stat-accuracy');
  const flaggedAttemptsEl = document.getElementById('admin-stat-flagged');

  const quizForm = document.getElementById('quiz-creator-form');
  const questionsContainer = document.getElementById('questions-builder-container');
  const addQuestionBtn = document.getElementById('btn-add-question-form');
  const formAlertBox = document.getElementById('form-alert-box');

  // Set today's date as default in assign date picker
  const dateInput = document.getElementById('quiz-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // --- STATE FOR QUIZ QUESTIONS CREATION ---
  let nextQuestionId = 1;

  // Add initial question input card by default
  addQuestionCard();

  addQuestionBtn.addEventListener('click', () => {
    addQuestionCard();
  });

  function addQuestionCard() {
    const qId = nextQuestionId++;
    
    const qCard = document.createElement('div');
    qCard.className = 'admin-question-builder';
    qCard.id = `q-card-${qId}`;
    
    qCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4 style="color:var(--primary); font-weight:600;">Question #${questionsContainer.children.length + 1}</h4>
        <button type="button" class="btn-logout" style="padding:0.2rem 0.6rem; font-size:0.8rem;" onclick="removeQuestionCard(${qId})">Remove</button>
      </div>
      
      <div class="form-group">
        <label>Question Text (Use newlines for code blocks if enabled)</label>
        <textarea class="input-control q-text" style="min-height:70px;" placeholder="e.g. What is the output of the following Java snippet?" required></textarea>
      </div>

      <div style="display:flex; gap:0.5rem; align-items:center; font-size:0.9rem;">
        <input type="checkbox" class="q-iscode" id="iscode-${qId}">
        <label for="iscode-${qId}" style="cursor:pointer; font-weight:500;">Format as Java Code Block</label>
      </div>

      <div class="admin-option-group">
        <div class="form-group">
          <label>Option A</label>
          <input type="text" class="input-control opt-0" placeholder="Option A" required>
        </div>
        <div class="form-group">
          <label>Option B</label>
          <input type="text" class="input-control opt-1" placeholder="Option B" required>
        </div>
        <div class="form-group">
          <label>Option C</label>
          <input type="text" class="input-control opt-2" placeholder="Option C" required>
        </div>
        <div class="form-group">
          <label>Option D</label>
          <input type="text" class="input-control opt-3" placeholder="Option D" required>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 2fr; gap:1rem;">
        <div class="form-group">
          <label>Correct Option</label>
          <select class="input-control q-correct">
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
          </select>
        </div>
        <div class="form-group">
          <label>Explanation</label>
          <input type="text" class="input-control q-explanation" placeholder="Provide why the answer is correct (optional)">
        </div>
      </div>
    `;

    questionsContainer.appendChild(qCard);
    renumberQuestions();
    return qCard;
  }

  // Renumber headings helper
  function renumberQuestions() {
    const cards = questionsContainer.querySelectorAll('.admin-question-builder');
    cards.forEach((card, index) => {
      const title = card.querySelector('h4');
      if (title) title.textContent = `Question #${index + 1}`;
    });
  }

  // Exposed globally to remove a card
  window.removeQuestionCard = (id) => {
    const card = document.getElementById(`q-card-${id}`);
    if (card) {
      card.remove();
      renumberQuestions();
    }
  };

  // --- SAMPLE CSV DOWNLOADER ---
  const downloadSampleBtn = document.getElementById('btn-download-sample-csv');
  if (downloadSampleBtn) {
    downloadSampleBtn.addEventListener('click', () => {
      const csvHeader = `"Question","Option A","Option B","Option C","Option D","Correct Option","Explanation","Is Code"\n`;
      const sampleRow1 = `"Which keyword is used to prevent a class from being inherited?","static","private","final","abstract","C","The final keyword prevents inheritance.","false"\n`;
      const sampleRow2 = `"Consider the code:\nclass Test {\n  public static void main(String[] args) {\n    System.out.println(""Hello"");\n  }\n}\nWhat is the output?","Hello","Compilation Error","Runtime Error","None","A","Prints Hello to console.","true"\n`;
      
      const blob = new Blob([csvHeader + sampleRow1 + sampleRow2], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'java_oop_quiz_sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // --- CSV PARSER (RFC 4180 compliant) ---
  function parseCSVText(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  }

  // --- CSV FILE IMPORT ---
  const importCsvBtn = document.getElementById('btn-import-csv');
  const csvFileInput = document.getElementById('quiz-csv-file');

  if (importCsvBtn && csvFileInput) {
    importCsvBtn.addEventListener('click', () => {
      const file = csvFileInput.files[0];
      if (!file) {
        showFormAlert('Please select a .csv file first.', 'danger');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const rows = parseCSVText(content);
          
          if (rows.length < 2) {
            throw new Error('CSV file is empty or missing data rows.');
          }

          // Clear existing question cards
          questionsContainer.innerHTML = '';
          nextQuestionId = 1;

          let loadedCount = 0;

          // Skip header row if present
          const startIdx = rows[0][0].toLowerCase().includes('question') ? 1 : 0;

          for (let i = startIdx; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5 || !row[0].trim()) continue; // skip blank rows

            const qCard = addQuestionCard();

            const qText = row[0].trim();
            const optA = row[1] ? row[1].trim() : '';
            const optB = row[2] ? row[2].trim() : '';
            const optC = row[3] ? row[3].trim() : '';
            const optD = row[4] ? row[4].trim() : '';
            
            // Normalize correct option (0-3, or A-D)
            let rawCorrect = row[5] ? row[5].trim().toUpperCase() : '0';
            let correctIdx = 0;
            if (rawCorrect === 'A' || rawCorrect === '0') correctIdx = 0;
            else if (rawCorrect === 'B' || rawCorrect === '1') correctIdx = 1;
            else if (rawCorrect === 'C' || rawCorrect === '2') correctIdx = 2;
            else if (rawCorrect === 'D' || rawCorrect === '3') correctIdx = 3;

            const explanation = row[6] ? row[6].trim() : '';
            const rawIsCode = row[7] ? row[7].trim().toLowerCase() : 'false';
            const isCode = rawIsCode === 'true' || rawIsCode === '1' || rawIsCode === 'yes';

            // Set values into card DOM inputs
            qCard.querySelector('.q-text').value = qText;
            qCard.querySelector('.q-iscode').checked = isCode;
            qCard.querySelector('.opt-0').value = optA;
            qCard.querySelector('.opt-1').value = optB;
            qCard.querySelector('.opt-2').value = optC;
            qCard.querySelector('.opt-3').value = optD;
            qCard.querySelector('.q-correct').value = correctIdx;
            qCard.querySelector('.q-explanation').value = explanation;

            loadedCount++;
          }

          if (loadedCount === 0) {
            addQuestionCard(); // Fallback if no valid questions found
            throw new Error('No valid questions could be extracted from the CSV file.');
          }

          showFormAlert(`Successfully imported ${loadedCount} questions from CSV into the editor! Review and click "Assign and Save Quiz".`, 'success');
          csvFileInput.value = ''; // Reset file picker
        } catch (err) {
          showFormAlert(err.message, 'danger');
        }
      };

      reader.readAsText(file);
    });
  }

  // --- SUBMIT NEW QUIZ ---
  quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormAlert();

    const title = document.getElementById('quiz-title').value;
    const description = document.getElementById('quiz-desc').value;
    const timeLimit = parseInt(document.getElementById('quiz-time').value);
    const assignedDate = document.getElementById('quiz-date').value;
    const startTime = document.getElementById('quiz-start-time').value;
    const endTime = document.getElementById('quiz-end-time').value;

    const questionCards = questionsContainer.querySelectorAll('.admin-question-builder');
    if (questionCards.length === 0) {
      showFormAlert('You must add at least one question to the quiz.', 'danger');
      return;
    }

    const questions = [];
    questionCards.forEach(card => {
      const questionText = card.querySelector('.q-text').value;
      const isCode = card.querySelector('.q-iscode').checked;
      const options = [
        card.querySelector('.opt-0').value,
        card.querySelector('.opt-1').value,
        card.querySelector('.opt-2').value,
        card.querySelector('.opt-3').value
      ];
      const correctAnswer = parseInt(card.querySelector('.q-correct').value);
      const explanation = card.querySelector('.q-explanation').value;

      questions.push({
        questionText,
        isCode,
        options,
        correctAnswer,
        explanation
      });
    });

    try {
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          description,
          questions,
          timeLimit,
          assignedDate,
          startTime,
          endTime
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create quiz');

      showFormAlert('Quiz assigned and saved successfully!', 'success');
      
      // Reset form controls
      quizForm.reset();
      questionsContainer.innerHTML = '';
      nextQuestionId = 1;
      addQuestionCard();
      loadQuizzes();
      
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    } catch (err) {
      showFormAlert(err.message, 'danger');
    }
  });

  function showFormAlert(message, type = 'danger') {
    formAlertBox.textContent = message;
    formAlertBox.style.display = 'block';
    if (type === 'danger') {
      formAlertBox.style.backgroundColor = 'var(--danger-bg)';
      formAlertBox.style.border = '1px solid var(--danger)';
      formAlertBox.style.color = '#fecaca';
    } else {
      formAlertBox.style.backgroundColor = 'var(--success-bg)';
      formAlertBox.style.border = '1px solid var(--success)';
      formAlertBox.style.color = '#a7f3d0';
    }
  }

  function hideFormAlert() {
    formAlertBox.style.display = 'none';
  }

  // --- FETCH STUDENT AUDITS TABLE ---
  async function loadStudentAttempts() {
    try {
      const res = await fetch('/api/admin/attempts', {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Could not retrieve progress logs');
      const attempts = await res.json();

      totalAttemptsEl.textContent = attempts.length;

      if (attempts.length === 0) {
        attemptsTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No student attempts logged yet.</td>
          </tr>
        `;
        avgAccuracyEl.textContent = '0%';
        flaggedAttemptsEl.textContent = '0';
        return;
      }

      let totalAccuracy = 0;
      let flaggedCount = 0;

      attemptsTableBody.innerHTML = '';
      attempts.forEach((attempt, index) => {
        const accuracy = Math.round((attempt.score / attempt.totalQuestions) * 100);
        totalAccuracy += accuracy;
        
        const isFlagged = attempt.status === 'terminated' || attempt.violationCount >= 3;
        if (isFlagged) flaggedCount++;

        const studentName = attempt.student ? attempt.student.username : 'Unknown Student';
        const studentEmail = attempt.student ? attempt.student.email : '';
        const quizTitle = attempt.quiz ? attempt.quiz.title : 'Deleted Quiz';

        const dateStr = new Date(attempt.completedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const mins = Math.floor(attempt.timeTaken / 60);
        const secs = attempt.timeTaken % 60;
        const timeStr = `${mins}m ${secs}s`;

        const warningClass = attempt.violationCount === 0 
          ? 'color: var(--success); font-weight:600;' 
          : attempt.violationCount < 3 
            ? 'color: var(--warning); font-weight:600;' 
            : 'color: var(--danger); font-weight:600;';

        const statusLabel = attempt.status === 'terminated'
          ? '<span class="status-badge violated">TERMINATED</span>'
          : isFlagged
            ? '<span class="status-badge violated">SUSPICIOUS</span>'
            : '<span class="status-badge clean">SECURE</span>';

        // Render audit timeline logs drawer contents
        let timelineHtml = '';
        if (attempt.violations && attempt.violations.length > 0) {
          attempt.violations.forEach(v => {
            const vTime = new Date(v.timestamp).toLocaleTimeString();
            timelineHtml += `
              <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem; border-bottom:1px solid rgba(255,255,255,0.02); padding-bottom:0.2rem;">
                <span style="color:var(--danger); font-weight:500;">🚨 [${v.type}]</span>
                <span style="color:var(--text-muted); font-size:0.75rem;">${vTime}</span>
              </div>
              <div style="color:var(--text-secondary); margin-bottom:0.6rem; padding-left:1rem; line-height:1.4;">${v.details}</div>
            `;
          });
        } else {
          timelineHtml = '<div style="color:var(--success); text-align:center;">No violations logged. Exam was completed securely.</div>';
        }

        const trId = `tr-drawer-${index}`;

        attemptsTableBody.innerHTML += `
          <tr>
            <td>
              <strong>${studentName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${studentEmail}</div>
            </td>
            <td>${quizTitle}</td>
            <td><strong>${attempt.score}/${attempt.totalQuestions}</strong> (${accuracy}%)</td>
            <td>${timeStr}</td>
            <td style="${warningClass}">${attempt.violationCount}</td>
            <td>${statusLabel}</td>
            <td>
              <button class="timeline-toggle" onclick="toggleTimelineDrawer('${trId}')">Inspect Logs</button>
            </td>
          </tr>
          <tr id="${trId}" style="display:none; background: #0c0d12;">
            <td colspan="7">
              <div style="padding: 1rem; border-left: 3px solid ${isFlagged ? 'var(--danger)' : 'var(--success)'};">
                <h5 style="margin-bottom:0.8rem; font-weight:600; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.5px; color:var(--text-secondary);">Chronological Proctor Security Details (${dateStr})</h5>
                ${timelineHtml}
              </div>
            </td>
          </tr>
        `;
      });

      avgAccuracyEl.textContent = `${Math.round(totalAccuracy / attempts.length)}%`;
      flaggedAttemptsEl.textContent = flaggedCount;

    } catch (err) {
      console.error(err);
      attemptsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td>
        </tr>
      `;
    }
  }

  // --- FETCH CREATED QUIZZES TABLE ---
  async function loadQuizzes() {
    const quizzesTableBody = document.getElementById('admin-quizzes-table-body');
    if (!quizzesTableBody) return;

    try {
      const res = await fetch('/api/admin/quizzes', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Could not load quizzes');
      const quizzes = await res.json();

      if (quizzes.length === 0) {
        quizzesTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No quizzes created yet.</td>
          </tr>
        `;
        return;
      }

      quizzesTableBody.innerHTML = '';
      quizzes.forEach(quiz => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = quiz.assignedDate === todayStr;
        const statusText = quiz.isActive 
          ? (isToday ? '<span class="status-badge clean">ACTIVE TODAY</span>' : '<span class="status-badge" style="background:rgba(124, 58, 237, 0.1); color:var(--primary); border:1px solid var(--primary);">SCHEDULED</span>')
          : '<span class="status-badge violated">INACTIVE</span>';

        const hoursText = `${quiz.startTime || '00:00'} - ${quiz.endTime || '23:59'}`;

        quizzesTableBody.innerHTML += `
          <tr>
            <td><strong>${quiz.title}</strong></td>
            <td>${quiz.assignedDate}</td>
            <td><code>${hoursText}</code></td>
            <td>${quiz.questions.length} questions</td>
            <td>${quiz.timeLimit} mins</td>
            <td>${statusText}</td>
          </tr>
        `;
      });
    } catch (err) {
      console.error(err);
      quizzesTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td>
        </tr>
      `;
    }
  }

  // Exposed globally to toggle inspection logs
  window.toggleTimelineDrawer = (trId) => {
    const el = document.getElementById(trId);
    if (el) {
      if (el.style.display === 'none') {
        el.style.display = 'table-row';
      } else {
        el.style.display = 'none';
      }
    }
  };

  // Run initial dashboard load
  await loadStudentAttempts();
  await loadQuizzes();
});
