document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authorized as admin
  const user = checkAuth('admin');
  if (!user) return;

  // --- ADMIN TABS NAVIGATION LOGIC ---
  // Wait a bit for navbar tabs to be created by utils.js
  await new Promise(resolve => setTimeout(resolve, 50));

  const tabHome = document.getElementById('tab-admin-home');
  const tabStudents = document.getElementById('tab-admin-students');
  const tabResults = document.getElementById('tab-admin-results');
  const tabView = document.getElementById('tab-admin-view');
  const tabCreate = document.getElementById('tab-admin-create');

  const panelHome = document.getElementById('panel-admin-home');
  const panelStudents = document.getElementById('panel-admin-students');
  const panelResults = document.getElementById('panel-admin-results');
  const panelView = document.getElementById('panel-admin-view');
  const panelCreate = document.getElementById('panel-admin-create');

  const tabs = [tabHome, tabStudents, tabResults, tabView, tabCreate];
  const panels = [panelHome, panelStudents, panelResults, panelView, panelCreate];

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

  const attemptsTableBody = document.getElementById('admin-attempts-table-body');
  const totalAttemptsEl = document.getElementById('admin-stat-attempts');
  const avgAccuracyEl = document.getElementById('admin-stat-accuracy');
  const flaggedAttemptsEl = document.getElementById('admin-stat-flagged');

  const quizForm = document.getElementById('quiz-creator-form');
  const questionsContainer = document.getElementById('questions-builder-container');
  const addQuestionBtn = document.getElementById('btn-add-question-form');

  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set today's date as default in assign date picker
  const dateInput = document.getElementById('quiz-date');
  if (dateInput) {
    dateInput.value = getLocalDateStr();
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

    // Comprehensive Time Validation
    const now = new Date();
    const currentDate = getLocalDateStr();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Check if end time is before start time
    if (startTime && endTime && startTime >= endTime) {
      showFormAlert('⚠️ Validation Error: End Time must be later than Start Time. Example: Start at 09:00, End at 17:00.', 'error');
      return;
    }

    // 2. Check if assigned date is in the past
    if (assignedDate < currentDate) {
      showFormAlert('⚠️ Validation Error: Cannot assign quiz to a past date. Please select today or a future date.', 'error');
      return;
    }

    // 3. Check if start time is in the past (only for today's date)
    if (assignedDate === currentDate && startTime < currentTime) {
      showFormAlert('⚠️ Validation Error: Start Time cannot be in the past. Current time is ' + currentTime + '. Please select a future time.', 'error');
      return;
    }

    // 4. Check if end time is in the past (only for today's date)
    if (assignedDate === currentDate && endTime < currentTime) {
      showFormAlert('⚠️ Validation Error: End Time cannot be in the past. Current time is ' + currentTime + '. Please select a future time.', 'error');
      return;
    }

    // 5. Check if time window is too short (at least 5 minutes)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const timeDiffMinutes = endMinutes - startMinutes;

    if (timeDiffMinutes < 5) {
      showFormAlert('⚠️ Validation Error: Test window must be at least 5 minutes long. Current window is ' + timeDiffMinutes + ' minute(s).', 'error');
      return;
    }

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
        dateInput.value = getLocalDateStr();
      }
    } catch (err) {
      showFormAlert(err.message, 'danger');
    }
  });

  // --- FLOATING ALERT SYSTEM ---
  let alertTimeout;

  function showFloatingAlert(message, type = 'error') {
    const floatingAlert = document.getElementById('floating-alert');
    const alertIcon = document.getElementById('floating-alert-icon');
    const alertMessage = document.getElementById('floating-alert-message');
    const alertClose = document.getElementById('floating-alert-close');

    if (!floatingAlert) return;

    // Clear any existing timeout
    if (alertTimeout) {
      clearTimeout(alertTimeout);
    }

    // Remove previous type classes
    floatingAlert.classList.remove('success', 'error', 'warning');

    // Set icon based on type
    let iconHtml = '';
    if (type === 'success') {
      iconHtml = '✓';
      floatingAlert.classList.add('success');
    } else if (type === 'error' || type === 'danger') {
      iconHtml = '⚠';
      floatingAlert.classList.add('error');
    } else if (type === 'warning') {
      iconHtml = '!';
      floatingAlert.classList.add('warning');
    }

    alertIcon.textContent = iconHtml;
    alertMessage.textContent = message;

    // Show the alert
    floatingAlert.classList.add('show');

    // Auto-hide after 5 seconds
    alertTimeout = setTimeout(() => {
      hideFloatingAlert();
    }, 5000);

    // Close button handler
    alertClose.onclick = () => {
      hideFloatingAlert();
    };
  }

  function hideFloatingAlert() {
    const floatingAlert = document.getElementById('floating-alert');
    if (floatingAlert) {
      floatingAlert.classList.remove('show');
    }
    if (alertTimeout) {
      clearTimeout(alertTimeout);
    }
  }

  // Alias for backward compatibility
  function showFormAlert(message, type = 'danger') {
    showFloatingAlert(message, type);
  }

  function hideFormAlert() {
    hideFloatingAlert();
  }

  let allAttempts = [];

  // --- FETCH STUDENT AUDITS TABLE ---
  async function loadStudentAttempts() {
    try {
      const res = await fetch('/api/admin/attempts', {
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Could not retrieve progress logs');
      allAttempts = await res.json();

      const quizFilterSelect = document.getElementById('admin-quiz-filter');
      const selectedQuizId = quizFilterSelect ? quizFilterSelect.value : 'all';
      renderFilteredAttempts(selectedQuizId);
    } catch (err) {
      console.error(err);
      attemptsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td>
        </tr>
      `;
    }
  }

  function renderFilteredAttempts(filterQuizId = 'all') {
    let filtered = allAttempts;
    if (filterQuizId !== 'all') {
      filtered = allAttempts.filter(a => a.quiz_id === filterQuizId);
    }

    totalAttemptsEl.textContent = filtered.length;

    if (filtered.length === 0) {
      const msg = filterQuizId === 'all' 
        ? 'No student attempts logged yet.' 
        : 'No student attempts logged for this specific test yet.';
      attemptsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">${msg}</td>
        </tr>
      `;
      avgAccuracyEl.textContent = '0%';
      flaggedAttemptsEl.textContent = '0';
      return;
    }

    let totalAccuracy = 0;
    let flaggedCount = 0;

    attemptsTableBody.innerHTML = '';
    filtered.forEach((attempt, index) => {
      const accuracy = Math.round((attempt.score / attempt.total_questions) * 100);
      totalAccuracy += accuracy;

      const isFlagged = attempt.status === 'terminated' || attempt.violation_count >= 3;
      if (isFlagged) flaggedCount++;

      const studentName = attempt.users ? attempt.users.username : 'Unknown Student';
      const studentEmail = attempt.users ? attempt.users.email : '';
      const quizTitle = attempt.quizzes ? attempt.quizzes.title : 'Deleted Quiz';

      const dateStr = new Date(attempt.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const mins = Math.floor(attempt.time_taken / 60);
      const secs = attempt.time_taken % 60;
      const timeStr = `${mins}m ${secs}s`;

      const warningClass = attempt.violation_count === 0
        ? 'color: var(--success); font-weight:600;'
        : attempt.violation_count < 3
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
              <span style="color:var(--danger); font-weight:500;">[Warning - ${v.type}]</span>
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
          <td><strong>${attempt.score}/${attempt.total_questions}</strong> (${accuracy}%)</td>
          <td>${timeStr}</td>
          <td style="${warningClass}">${attempt.violation_count}</td>
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

    avgAccuracyEl.textContent = `${Math.round(totalAccuracy / filtered.length)}%`;
    flaggedAttemptsEl.textContent = flaggedCount;
  }

  // --- EXPORT TO EXCEL FUNCTIONALITY ---
  function exportToExcel() {
    const quizFilterSelect = document.getElementById('admin-quiz-filter');
    const selectedQuizId = quizFilterSelect ? quizFilterSelect.value : 'all';

    let filtered = allAttempts;
    if (selectedQuizId !== 'all') {
      filtered = allAttempts.filter(a => a.quiz_id === selectedQuizId);
    }

    if (filtered.length === 0) {
      alert('No data to export. Please ensure there are test results available.');
      return;
    }

    // Prepare data for Excel
    const excelData = filtered.map(attempt => {
      const accuracy = Math.round((attempt.score / attempt.total_questions) * 100);
      const studentName = attempt.users ? attempt.users.username : 'Unknown Student';
      const studentEmail = attempt.users ? attempt.users.email : '';
      const quizTitle = attempt.quizzes ? attempt.quizzes.title : 'Deleted Quiz';

      const dateStr = new Date(attempt.completed_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const mins = Math.floor(attempt.time_taken / 60);
      const secs = attempt.time_taken % 60;
      const timeStr = `${mins}m ${secs}s`;

      const statusLabel = attempt.status === 'terminated'
        ? 'TERMINATED'
        : (attempt.violation_count >= 3 ? 'SUSPICIOUS' : 'SECURE');

      // Compile violations details
      let violationsDetails = '';
      if (attempt.violations && attempt.violations.length > 0) {
        violationsDetails = attempt.violations.map(v => {
          const vTime = new Date(v.timestamp).toLocaleTimeString();
          return `[${vTime}] ${v.type}: ${v.details}`;
        }).join(' | ');
      } else {
        violationsDetails = 'No violations';
      }

      return {
        'Student Name': studentName,
        'Student Email': studentEmail,
        'Quiz Title': quizTitle,
        'Score': `${attempt.score}/${attempt.total_questions}`,
        'Accuracy (%)': accuracy,
        'Time Taken': timeStr,
        'Violations Count': attempt.violation_count,
        'Status': statusLabel,
        'Completed At': dateStr,
        'Violation Details': violationsDetails
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 }, // Student Name
      { wch: 25 }, // Student Email
      { wch: 30 }, // Quiz Title
      { wch: 10 }, // Score
      { wch: 12 }, // Accuracy
      { wch: 12 }, // Time Taken
      { wch: 15 }, // Violations Count
      { wch: 12 }, // Status
      { wch: 20 }, // Completed At
      { wch: 50 }  // Violation Details
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

    // Generate filename with current date
    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const filterLabel = selectedQuizId === 'all' ? 'All_Tests' : 'Filtered_Test';
    const filename = `Test_Results_${filterLabel}_${dateStamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  }

  // Add event listener for export button
  const exportBtn = document.getElementById('btn-export-excel');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
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
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No quizzes created yet.</td>
          </tr>
        `;
        return;
      }

      // Populate Quiz Filter Select Options
      const quizFilterSelect = document.getElementById('admin-quiz-filter');
      if (quizFilterSelect) {
        const currentSelection = quizFilterSelect.value;
        quizFilterSelect.innerHTML = '<option value="all">-- All Conducted Tests --</option>';
        quizzes.forEach(q => {
          quizFilterSelect.innerHTML += `<option value="${q.id}">${q.title} (${q.assigned_date})</option>`;
        });
        if (currentSelection) quizFilterSelect.value = currentSelection;

        // Bind filter change listener once
        if (!quizFilterSelect.dataset.listenerBound) {
          quizFilterSelect.dataset.listenerBound = 'true';
          quizFilterSelect.addEventListener('change', (e) => {
            renderFilteredAttempts(e.target.value);
          });
        }
      }

      quizzesTableBody.innerHTML = '';
      quizzes.forEach(quiz => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = quiz.assigned_date === todayStr;
        const statusText = quiz.is_active
          ? (isToday ? '<span class="status-badge clean">ACTIVE TODAY</span>' : '<span class="status-badge" style="background:rgba(124, 58, 237, 0.1); color:var(--primary); border:1px solid var(--primary);">SCHEDULED</span>')
          : '<span class="status-badge violated">INACTIVE</span>';

        const hoursText = `${quiz.start_time || '00:00'} - ${quiz.end_time || '23:59'}`;

        quizzesTableBody.innerHTML += `
          <tr>
            <td><strong>${quiz.title}</strong></td>
            <td>${quiz.assigned_date}</td>
            <td><code>${hoursText}</code></td>
            <td>${quiz.questions.length} questions</td>
            <td>${quiz.time_limit} mins</td>
            <td>${statusText}</td>
            <td>
              <button class="btn-logout" style="padding:0.2rem 0.6rem; font-size:0.8rem; margin:0;" onclick="deleteQuiz('${quiz.id}')">Delete</button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error(err);
      quizzesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td>
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

  // Exposed globally to delete a quiz
  window.deleteQuiz = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz? This will also permanently delete all student attempts logged for this quiz.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete quiz');

      alert('Quiz deleted successfully!');
      
      // Refresh both student progress logs and quizzes list
      await loadStudentAttempts();
      await loadQuizzes();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- FETCH REGISTERED STUDENTS ---
  async function loadRegisteredStudents() {
    const studentsTableBody = document.getElementById('admin-students-table-body');
    if (!studentsTableBody) return;

    try {
      const res = await fetch('/api/admin/students', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Could not load students');
      const students = await res.json();

      if (students.length === 0) {
        studentsTableBody.innerHTML = `
          <tr>
            <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">No students registered yet.</td>
          </tr>
        `;
        return;
      }

      studentsTableBody.innerHTML = '';
      students.forEach(student => {
        const regDateStr = new Date(student.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        studentsTableBody.innerHTML += `
          <tr>
            <td><strong>${student.username}</strong></td>
            <td>${student.email}</td>
            <td>${regDateStr}</td>
          </tr>
        `;
      });
    } catch (err) {
      console.error(err);
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td>
        </tr>
      `;
    }
  }

  // Run initial dashboard load
  await loadStudentAttempts();
  await loadQuizzes();
  await loadRegisteredStudents();
});
