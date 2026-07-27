// --- NATIVE API VAULT (Anti-Extension Script Injection Protection) ---
const _realAddEventListener = EventTarget.prototype.addEventListener;
const _realRemoveEventListener = EventTarget.prototype.removeEventListener;
const _realHasFocus = Document.prototype.hasFocus || document.hasFocus;
const _realGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authorize user as student
  const user = checkAuth('student');
  if (!user) return;

  // Extract quiz ID from query params
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  
  if (!quizId) {
    alert('Invalid Quiz Selection. Redirecting to dashboard...');
    window.location.href = '/dashboard.html';
    return;
  }

  // --- UI Elements ---
  const setupCard = document.getElementById('setup-card');
  const questionCard = document.getElementById('question-card');
  const resultsCard = document.getElementById('results-card');
  const quizSidebar = document.getElementById('quiz-sidebar');
  
  const checkCamStatus = document.getElementById('check-camera-status');
  const initExamBtn = document.getElementById('btn-initialize-exam');
  
  const questionIndexLabel = document.getElementById('question-index-label');
  const btnFlagQuestion = document.getElementById('btn-flag-question');
  const questionBodyText = document.getElementById('question-body-text');
  const questionCodeBlock = document.getElementById('question-code-block');
  const codeContent = document.getElementById('code-content');
  const questionOptionsList = document.getElementById('question-options-list');
  
  const btnPrev = document.getElementById('btn-prev-question');
  const btnNext = document.getElementById('btn-next-question');
  const btnSkip = document.getElementById('btn-skip-question');
  
  const webcamElement = document.getElementById('webcam-element');
  const sidebarTimerClock = document.getElementById('sidebar-timer-clock');
  const sidebarPaletteGrid = document.getElementById('sidebar-palette-grid');
  const btnSubmitSidebar = document.getElementById('btn-submit-exam-sidebar');
  
  const warningModal = document.getElementById('warning-modal');
  const warningTitle = document.getElementById('warning-modal-title');
  const warningBody = document.getElementById('warning-modal-body');
  const btnDismissWarning = document.getElementById('btn-dismiss-warning');
  
  const confirmModal = document.getElementById('confirm-modal');
  const btnCancelSubmit = document.getElementById('btn-cancel-submit');
  const btnConfirmSubmit = document.getElementById('btn-confirm-submit');

  // --- Global Exam State ---
  let quizData = null;
  let currentQuestionIndex = 0;
  let answers = [];     // Stores index of user selected options
  let flagged = [];     // Stores boolean array of review flags
  let visited = [];     // Stores boolean array of visited state
  let violations = [];  // Array of logged violations
  let violationCount = 0;
  let timeLeft = 0;     // Remaining seconds
  let timerInterval = null;
  let startTime = null;
  let webcamStream = null;
  let quizStarted = false;
  let quizSubmitted = false;

  // --- Initialize Camera Permissions Check ---
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    webcamElement.srcObject = webcamStream;
    checkCamStatus.textContent = 'Active & Secure';
    checkCamStatus.style.color = 'var(--success)';
    initExamBtn.disabled = false;
    initExamBtn.className = 'btn-start-quiz';
  } catch (err) {
    console.warn('Webcam permission denied or unavailable. Fallback to simulation mode.');
    checkCamStatus.textContent = 'Simulated feed fallback active';
    checkCamStatus.style.color = 'var(--warning)';
    
    // Still allow the exam for testing, but simulate camera failure
    initExamBtn.disabled = false;
    initExamBtn.className = 'btn-start-quiz';
  }

  // --- START EXAM ACTION ---
  initExamBtn.addEventListener('click', async () => {
    try {
      // 1. Force Fullscreen mode
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
      
      // 2. Hide setup panel, load quiz data
      setupCard.style.display = 'none';
      questionCard.style.display = 'block';
      quizSidebar.style.display = 'flex';
      
      await startQuiz();
    } catch (err) {
      console.error(err);
      alert('Fullscreen authorization is required to start the exam. Please try again.');
    }
  });

  // --- FETCH QUESTIONS & INITIALIZE STATE ---
  async function startQuiz() {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/take`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to start quiz session');

      quizData = data;
      const numQuestions = quizData.questions.length;
      
      // Init states
      answers = new Array(numQuestions).fill(null);
      flagged = new Array(numQuestions).fill(false);
      visited = new Array(numQuestions).fill(false);
      visited[0] = true;
      
      timeLeft = quizData.timeLimit * 60; // Convert to seconds
      startTime = new Date();
      quizStarted = true;

      // Mount webcam feed
      if (webcamStream) {
        webcamElement.srcObject = webcamStream;
      } else {
        // Render cool placeholder pattern to indicate simulation
        webcamElement.style.background = 'repeating-linear-gradient(45deg, #151824, #151824 10px, #1b1e2e 10px, #1b1e2e 20px)';
        const overlay = document.querySelector('.tracking-reticle');
        if (overlay) {
          const simulatedLabel = document.createElement('div');
          simulatedLabel.style.position = 'absolute';
          simulatedLabel.style.color = 'var(--warning)';
          simulatedLabel.style.fontWeight = 'bold';
          simulatedLabel.style.fontSize = '0.8rem';
          simulatedLabel.style.textAlign = 'center';
          simulatedLabel.style.width = '100%';
          simulatedLabel.style.top = '40%';
          simulatedLabel.textContent = 'SIMULATED FEED ACTIVE';
          overlay.appendChild(simulatedLabel);
        }
      }

      // Start timers and event bindings
      startTimer();
      renderQuestion();
      renderPalette();
      bindProctoringEvents();

    } catch (err) {
      console.error(err);
      alert('Error initializing quiz: ' + err.message);
      window.location.href = '/dashboard.html';
    }
  }

  // --- RENDER CURRENT QUESTION ---
  function renderQuestion() {
    if (!quizData) return;
    
    const question = quizData.questions[currentQuestionIndex];
    visited[currentQuestionIndex] = true;

    // Headings
    questionIndexLabel.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.questions.length}`;
    
    // Question Text
    questionBodyText.textContent = question.questionText;

    // Code snippets
    if (question.isCode) {
      questionCodeBlock.style.display = 'block';
      // Format text slightly and insert
      codeContent.textContent = question.questionText.includes('class') || question.questionText.includes('void') 
        ? '' // Skip text showing twice if code block contains it
        : '';
      
      // Extract code block part
      let textLines = question.questionText.split('\n');
      let codeLines = [];
      let bodyLines = [];
      let insideCode = false;

      textLines.forEach(line => {
        if (line.trim().startsWith('class') || line.trim().startsWith('public class') || line.trim().startsWith('interface')) {
          insideCode = true;
        }
        if (insideCode) {
          codeLines.push(line);
        } else {
          bodyLines.push(line);
        }
      });

      if (codeLines.length > 0) {
        questionBodyText.textContent = bodyLines.join('\n').replace('Consider the code:', '').replace('What is the output?', '').replace('What will be the output?', '').trim();
        codeContent.textContent = codeLines.join('\n');
      } else {
        // Fallback if not easily parseable
        codeContent.textContent = question.questionText;
        questionBodyText.textContent = 'Analyze the code block below and determine the output:';
      }
    } else {
      questionCodeBlock.style.display = 'none';
    }

    // Flag State Check
    if (flagged[currentQuestionIndex]) {
      btnFlagQuestion.classList.add('flagged');
      btnFlagQuestion.innerHTML = 'Flagged';
    } else {
      btnFlagQuestion.classList.remove('flagged');
      btnFlagQuestion.innerHTML = 'Flag for Review';
    }

    // Options Rendering
    questionOptionsList.innerHTML = '';
    question.options.forEach((option, idx) => {
      const isSelected = answers[currentQuestionIndex] === idx;
      
      const optionItem = document.createElement('div');
      optionItem.className = `option-item ${isSelected ? 'selected' : ''}`;
      
      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.name = 'quiz-option';
      radioInput.id = `opt-${idx}`;
      radioInput.value = idx;
      radioInput.checked = isSelected;
      
      const label = document.createElement('label');
      label.htmlFor = `opt-${idx}`;
      label.className = 'option-label';
      label.textContent = option;

      // Click to choose option
      optionItem.addEventListener('click', () => {
        answers[currentQuestionIndex] = idx;
        
        // Remove selection classes and set for current
        document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
        optionItem.classList.add('selected');
        radioInput.checked = true;
        
        renderPalette();
      });

      optionItem.appendChild(radioInput);
      optionItem.appendChild(label);
      questionOptionsList.appendChild(optionItem);
    });

    // Nav controls status
    btnPrev.disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === quizData.questions.length - 1) {
      btnNext.textContent = 'Finish & Submit';
      btnNext.style.background = 'var(--success)';
    } else {
      btnNext.textContent = 'Next Question';
      btnNext.style.background = 'var(--primary)';
    }
  }

  // --- RENDER PALETTE GRID ---
  function renderPalette() {
    if (!quizData) return;
    
    sidebarPaletteGrid.innerHTML = '';
    quizData.questions.forEach((_, idx) => {
      const paletteNum = document.createElement('button');
      paletteNum.textContent = idx + 1;
      
      let statusClass = '';
      if (idx === currentQuestionIndex) {
        statusClass += ' active';
      }
      
      if (answers[idx] !== null) {
        statusClass += ' answered';
      } else if (visited[idx]) {
        statusClass += ' unanswered';
      }
      
      if (flagged[idx]) {
        statusClass += ' flagged';
      }

      paletteNum.className = `palette-num ${statusClass}`;
      
      paletteNum.addEventListener('click', () => {
        currentQuestionIndex = idx;
        renderQuestion();
        renderPalette();
      });

      sidebarPaletteGrid.appendChild(paletteNum);
    });
  }

  // --- TIMERS ---
  function startTimer() {
    timerInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitQuiz(true); // Forced submission on timeout
        return;
      }
      
      timeLeft--;
      
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      sidebarTimerClock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      // Warn user if time is less than 2 mins
      if (timeLeft === 120) {
        sidebarTimerClock.style.color = 'var(--danger)';
        showWarningModal('Time limit warning: Less than 2 minutes remaining! Plan your submission.');
      }
    }, 1000);
  }

  // --- NAVIGATION CONTROLS ---
  btnPrev.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
      renderPalette();
    }
  });

  btnNext.addEventListener('click', () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
      renderPalette();
    } else {
      // Clicked on the final "Finish & Submit" button
      confirmModal.classList.add('active');
    }
  });

  btnSkip.addEventListener('click', () => {
    answers[currentQuestionIndex] = null;
    document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
    const checkedRadio = document.querySelector('input[name="quiz-option"]:checked');
    if (checkedRadio) checkedRadio.checked = false;
    renderPalette();
  });

  btnFlagQuestion.addEventListener('click', () => {
    flagged[currentQuestionIndex] = !flagged[currentQuestionIndex];
    renderQuestion();
    renderPalette();
  });

  // Sidebar submission click
  btnSubmitSidebar.addEventListener('click', () => {
    confirmModal.classList.add('active');
  });

  btnCancelSubmit.addEventListener('click', () => {
    confirmModal.classList.remove('active');
  });

  btnConfirmSubmit.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    submitQuiz(false);
  });

  // --- PROCTORING ENGINE & DETECTIONS ---
  
  function bindProctoringEvents() {
    // 1. Tab Switch / Minimize detection (Capture phase binding)
    _realAddEventListener.call(document, 'visibilitychange', handleVisibilityChange, true);

    // 2. Fullscreen escape detection
    _realAddEventListener.call(document, 'fullscreenchange', handleFullscreenChange, true);
    _realAddEventListener.call(document, 'webkitfullscreenchange', handleFullscreenChange, true);

    // 3. Right-Click block
    _realAddEventListener.call(document, 'contextmenu', blockRightClick, true);

    // 4. Keyboard F12 / DevTools block
    _realAddEventListener.call(window, 'keydown', blockDevToolsKeys, true);

    // 5. Copy & Paste blocks
    _realAddEventListener.call(document, 'copy', blockCopyPaste, true);
    _realAddEventListener.call(document, 'paste', blockCopyPaste, true);
    _realAddEventListener.call(document, 'selectstart', blockTextSelection, true);

    // 6. Anti-Tamper & Extension Spoofing Scanner
    startAntiTamperScanner();
  }

  function unbindProctoringEvents() {
    _realRemoveEventListener.call(document, 'visibilitychange', handleVisibilityChange, true);
    _realRemoveEventListener.call(document, 'fullscreenchange', handleFullscreenChange, true);
    _realRemoveEventListener.call(document, 'webkitfullscreenchange', handleFullscreenChange, true);
    _realRemoveEventListener.call(document, 'contextmenu', blockRightClick, true);
    _realRemoveEventListener.call(window, 'keydown', blockDevToolsKeys, true);
    _realRemoveEventListener.call(document, 'copy', blockCopyPaste, true);
    _realRemoveEventListener.call(document, 'paste', blockCopyPaste, true);
    _realRemoveEventListener.call(document, 'selectstart', blockTextSelection, true);

    if (antiTamperInterval) clearInterval(antiTamperInterval);
  }

  function startAntiTamperScanner() {
    antiTamperInterval = setInterval(() => {
      if (quizSubmitted || !quizStarted) return;

      try {
        // Check if property getters for document.hidden or visibilityState were tampered with by extension
        const hiddenDesc = _realGetOwnPropertyDescriptor(Document.prototype, 'hidden') || _realGetOwnPropertyDescriptor(document, 'hidden');
        if (hiddenDesc && typeof hiddenDesc.get === 'function') {
          const fnString = hiddenDesc.get.toString();
          if (!fnString.includes('[native code]') && !fnString.includes('hidden')) {
            logViolation('Extension Script Injection', 'Browser extension script override detected on document.hidden API.');
            return;
          }
        }
      } catch (e) {}
    }, 1500);
  }


  // Warning Modal Actions
  btnDismissWarning.addEventListener('click', async () => {
    warningModal.classList.remove('active');
    
    // Re-verify fullscreen mode
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFullscreen) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
      } catch (err) {
        console.error('Failed to restore fullscreen:', err);
      }
    }
  });

  function showWarningModal(message, isCritical = false) {
    warningBody.textContent = message;
    
    if (isCritical) {
      warningTitle.textContent = 'EXAM TERMINATED';
      btnDismissWarning.style.display = 'none';
    } else {
      warningTitle.textContent = 'Security Violation Warning';
      btnDismissWarning.style.display = 'block';
    }
    
    warningModal.classList.add('active');
  }

  function logViolation(type, details) {
    if (quizSubmitted) return;

    const timestamp = new Date();
    violations.push({ type, timestamp, details });
    violationCount++;

    // Update Sidebar elements
    document.getElementById('sidebar-violations-count').textContent = `${violationCount} / 3`;
    
    const sidebarStatus = document.getElementById('sidebar-proctor-status');
    const camWrapper = document.getElementById('proctor-cam-wrapper');
    
    sidebarStatus.textContent = 'VIOLATION DETECTED';
    sidebarStatus.className = 'status-value status-violation';
    camWrapper.className = 'proctor-cam-wrapper violation';

    // Flash red, then restore secure label if under threshold
    setTimeout(() => {
      if (!quizSubmitted && violationCount < 3) {
        sidebarStatus.textContent = 'SECURE';
        sidebarStatus.className = 'status-value status-secure';
        camWrapper.className = 'proctor-cam-wrapper secure';
      }
    }, 4000);

    // Violation checks
    if (violationCount >= 3) {
      terminateQuiz();
    } else {
      showWarningModal(`Warning (${violationCount}/3): ${type} has been flagged. Details: ${details}`);
    }
  }

  function terminateQuiz() {
    unbindProctoringEvents();
    showWarningModal('Security system has terminated this exam attempt. Exceeded the maximum limit of 3 violations. Your answers are being compiled and submitted now.', true);
    
    setTimeout(() => {
      warningModal.classList.remove('active');
      submitQuiz(false, 'terminated');
    }, 4000);
  }

  // --- VIOLATION EVENT HANDLERS ---
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      logViolation('Tab Switch', 'User minimized browser window or switched to another tab.');
    }
  }


  function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFullscreen && !quizSubmitted) {
      logViolation('Fullscreen Breached', 'User exited secure fullscreen monitoring.');
    }
  }

  function blockRightClick(e) {
    e.preventDefault();
    logViolation('Right-Click Context Menu', 'User attempted to trigger right-click options.');
  }

  function blockDevToolsKeys(e) {
    const forbiddenKeys = ['F12'];
    const ctrlShiftKeys = ['I', 'i', 'J', 'j', 'C', 'c'];
    
    const isCtrlShift = e.ctrlKey && e.shiftKey && ctrlShiftKeys.includes(e.key);
    const isCtrlU = e.ctrlKey && (e.key === 'U' || e.key === 'u');
    const isCtrlS = e.ctrlKey && (e.key === 'S' || e.key === 's');

    if (forbiddenKeys.includes(e.key) || isCtrlShift || isCtrlU || isCtrlS) {
      e.preventDefault();
      logViolation('Keyboard Shortcut Blocked', `Attempted devtools command: ${e.key}`);
    }
  }

  function blockCopyPaste(e) {
    e.preventDefault();
    logViolation('Clipboard Action Blocked', 'User attempted to Copy or Paste within the exam page.');
  }

  function blockTextSelection(e) {
    e.preventDefault();
  }

  // --- SUBMIT EXAM CORE PAYLOAD ---
  async function submitQuiz(isTimeout = false, customStatus = null) {
    if (quizSubmitted) return;
    quizSubmitted = true;

    clearInterval(timerInterval);
    unbindProctoringEvents();

    // Release camera tracks
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }

    // Force Exit Fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
    }

    // Calculate time taken
    const endTime = new Date();
    const timeTaken = Math.round((endTime - startTime) / 1000);

    const submissionStatus = customStatus || (isTimeout ? 'completed' : 'completed');

    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          answers,
          violations,
          status: submissionStatus,
          timeTaken
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to submit exam details');

      // Hide active screens and display scorecard
      questionCard.style.display = 'none';
      quizSidebar.style.display = 'none';
      setupCard.style.display = 'none';
      resultsCard.style.display = 'block';

      // Load scorecard values
      document.getElementById('result-score-score').textContent = `${result.score}/${result.totalQuestions}`;
      
      const accuracy = Math.round((result.score / result.totalQuestions) * 100);
      document.getElementById('result-score-percent').textContent = `${accuracy}%`;
      document.getElementById('result-score-ring').style.setProperty('--percentage', accuracy);

      const mins = Math.floor(timeTaken / 60);
      const secs = timeTaken % 60;
      document.getElementById('result-meta-duration').textContent = `${mins}m ${secs}s`;

      const violCount = result.violationCount;
      const violEl = document.getElementById('result-meta-violations');
      violEl.textContent = `${violCount} Warnings`;
      
      if (violCount === 0) {
        violEl.style.color = 'var(--success)';
      } else if (violCount < 3) {
        violEl.style.color = 'var(--warning)';
      } else {
        violEl.style.color = 'var(--danger)';
      }

      // Verdict titles
      const verdictTitle = document.getElementById('result-verdict-title');
      if (submissionStatus === 'terminated') {
        verdictTitle.textContent = 'SECURITY TERMINATED';
        verdictTitle.style.color = 'var(--danger)';
      } else if (violCount >= 3) {
        verdictTitle.textContent = 'FLAGGED FOR SUSPICIOUS ACTIVITY';
        verdictTitle.style.color = 'var(--danger)';
      } else if (violCount > 0) {
        verdictTitle.textContent = 'CLEARED WITH WARNINGS';
        verdictTitle.style.color = 'var(--warning)';
      } else {
        verdictTitle.textContent = 'CLEARED SECURELY';
        verdictTitle.style.color = 'var(--success)';
      }

      // Populate violation timeline logs
      const timelineContainer = document.getElementById('result-audit-timeline');
      timelineContainer.innerHTML = '';
      
      // Start event log
      timelineContainer.innerHTML += `
        <div class="audit-item">
          <span class="audit-time">${startTime.toLocaleTimeString()}</span>
          <span class="audit-desc">System check completed. Examination session initialized.</span>
        </div>
      `;

      if (violations.length === 0) {
        timelineContainer.innerHTML += `
          <div class="audit-item" style="border-left-color: var(--success);">
            <span class="audit-time">${endTime.toLocaleTimeString()}</span>
            <span class="audit-desc" style="color: var(--success); font-weight: 500;">Excellent: No proctor violations flagged during this session.</span>
          </div>
        `;
      } else {
        violations.forEach(v => {
          const vTime = new Date(v.timestamp).toLocaleTimeString();
          timelineContainer.innerHTML += `
            <div class="audit-item violation-log">
              <span class="audit-time">${vTime}</span>
              <span class="audit-desc"><strong>[${v.type}]</strong> - ${v.details}</span>
            </div>
          `;
        });
      }

      timelineContainer.innerHTML += `
        <div class="audit-item">
          <span class="audit-time">${endTime.toLocaleTimeString()}</span>
          <span class="audit-desc">Exam compiled and finalized. Status: <strong>${submissionStatus.toUpperCase()}</strong>.</span>
        </div>
      `;

      // Populate review breakdown
      const reviewContainer = document.getElementById('result-review-items-container');
      reviewContainer.innerHTML = '';

      result.feedbackQuestions.forEach((q, idx) => {
        const itemClass = q.isCorrect ? 'correct' : 'incorrect';
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item glass ${itemClass}`;
        
        const qTitle = document.createElement('div');
        qTitle.className = 'review-question-text';
        qTitle.textContent = `Q${idx + 1}. ${q.questionText.split('\n')[0]}`; // Short title
        reviewItem.appendChild(qTitle);

        // Code block if relevant
        if (q.isCode) {
          const codeWrap = document.createElement('div');
          codeWrap.className = 'code-container';
          const codeEl = document.createElement('pre');
          codeEl.textContent = q.questionText.substring(q.questionText.indexOf('\n') + 1);
          codeWrap.appendChild(codeEl);
          reviewItem.appendChild(codeWrap);
        }

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'review-options';

        q.options.forEach((opt, oIdx) => {
          const optDiv = document.createElement('div');
          let tag = '';
          let optClass = 'review-option';

          if (oIdx === q.correctAnswer) {
            tag = ' [Correct Answer]';
            optClass += ' correct-option';
          } else if (oIdx === q.studentAnswer && !q.isCorrect) {
            tag = ' [Your Answer - Incorrect]';
            optClass += ' incorrect-selected';
          } else if (oIdx === q.studentAnswer) {
            tag = ' [Your Answer - Correct]';
            optClass += ' student-selected';
          }

          optDiv.className = optClass;
          optDiv.textContent = `${String.fromCharCode(65 + oIdx)}) ${opt}${tag}`;
          optionsDiv.appendChild(optDiv);
        });

        reviewItem.appendChild(optionsDiv);

        // Explanation
        const expDiv = document.createElement('div');
        expDiv.className = 'review-explanation';
        expDiv.innerHTML = `
          <strong>Explanation:</strong>
          <p>${q.explanation || 'No explanation available.'}</p>
        `;
        reviewItem.appendChild(expDiv);

        reviewContainer.appendChild(reviewItem);
      });

    } catch (err) {
      console.error(err);
      alert('Network error submitting answers: ' + err.message + '. Your local logs were preserved.');
    }
  }

});
