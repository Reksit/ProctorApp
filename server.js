const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Supabase client
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Security Headers Middleware (Anti-Framing & Anti-Script Injection)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate Limiting Middleware - Prevent DDoS Attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 429,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for static files
  skip: (req) => {
    return req.path.startsWith('/css') ||
           req.path.startsWith('/js') ||
           req.path.startsWith('/images') ||
           req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/);
  },
  // Use user ID if authenticated, otherwise use IP
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, 'public')));

// Test Supabase connection
console.log('Connecting to Supabase...');
supabase.from('users').select('count').then(() => {
  console.log('✅ Supabase Connected Successfully.');
}).catch(err => {
  console.error('❌ Supabase Connection Error:', err);
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Access Denied: Invalid Token' });
    req.user = user;
    next();
  });
};

// Admin Auth Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access Denied: Admin Privilege Required' });
  }
  next();
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, adminSecret } = req.body;

    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${email},username.eq.${username}`);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username or Email already registered' });
    }

    // Assign role based on admin secret code
    let role = 'student';
    const expectedSecret = process.env.ADMIN_SECRET || 'admin123';
    if (adminSecret && adminSecret === expectedSecret) {
      role = 'admin';
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password: hashedPassword,
        role
      }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Registration successful! Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (error) throw error;

    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'User not found' });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions for reliable local date & time formatting
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHHMM(timeStr, defaultVal = '00:00') {
  if (!timeStr || typeof timeStr !== 'string') return defaultVal;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return defaultVal;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultVal;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// --- QUIZ ROUTES ---

// Get today's assigned quizzes for students
app.get('/api/quizzes/today', authenticateToken, async (req, res) => {
  try {
    const todayStr = getLocalDateString();

    // Find ALL active quizzes (today, past, and future)
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('assigned_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    if (!quizzes || quizzes.length === 0) {
      return res.status(404).json({ message: 'No active quizzes available at the moment' });
    }

    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    // Process attempt status and time locks for each quiz in parallel
    const quizList = await Promise.all(quizzes.map(async (quiz) => {
      // Check if the student has already attempted this specific quiz
      const { data: attempts } = await supabase
        .from('attempts')
        .select('*')
        .eq('student_id', req.user.id)
        .eq('quiz_id', quiz.id);

      const attempt = attempts && attempts.length > 0 ? attempts[0] : null;

      let isLocked = false;
      let lockReason = '';

      const cleanStart = formatHHMM(quiz.start_time, '00:00');
      const cleanEnd = formatHHMM(quiz.end_time, '23:59');

      if (quiz.assigned_date < todayStr) {
        isLocked = true;
        lockReason = `Exam window expired. This quiz was assigned for ${quiz.assigned_date}.`;
      } else if (quiz.assigned_date > todayStr) {
        isLocked = true;
        lockReason = `Exam window has not opened yet. Scheduled for ${quiz.assigned_date}.`;
      } else {
        if (currentTimeStr < cleanStart) {
          isLocked = true;
          lockReason = `Exam window has not opened yet. Starts at ${cleanStart}.`;
        } else if (currentTimeStr > cleanEnd) {
          isLocked = true;
          lockReason = `Exam window has closed. The test ended at ${cleanEnd}.`;
        }
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        time_limit: quiz.time_limit,
        total_questions: quiz.questions.length,
        assigned_date: quiz.assigned_date,
        start_time: cleanStart,
        end_time: cleanEnd,
        alreadyAttempted: !!attempt,
        attemptDetails: attempt,
        isLocked,
        lockReason
      };
    }));

    res.json(quizList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching daily quizzes' });
  }
});

// Get quiz questions to take (answers stripped)
app.get('/api/quizzes/:id/take', authenticateToken, async (req, res) => {
  try {
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!quiz || !quiz.is_active) {
      return res.status(404).json({ message: 'Quiz not found or inactive' });
    }

    // Verify they haven't already taken it
    const { data: attempts } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', req.user.id)
      .eq('quiz_id', quiz.id);

    if (attempts && attempts.length > 0) {
      return res.status(400).json({ message: 'You have already completed this quiz' });
    }

    // Time constraints checks
    const todayStr = getLocalDateString();
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    const cleanStart = formatHHMM(quiz.start_time, '00:00');
    const cleanEnd = formatHHMM(quiz.end_time, '23:59');

    if (quiz.assigned_date < todayStr) {
      return res.status(400).json({ message: `Access Blocked: Quiz expired on ${quiz.assigned_date}.` });
    }
    if (quiz.assigned_date > todayStr) {
      return res.status(400).json({ message: `Access Blocked: Quiz scheduled for ${quiz.assigned_date}.` });
    }
    if (currentTimeStr < cleanStart) {
      return res.status(400).json({ message: `Access Blocked: This quiz starts at ${cleanStart}.` });
    }
    if (currentTimeStr > cleanEnd) {
      return res.status(400).json({ message: `Access Blocked: This quiz ended at ${cleanEnd}.` });
    }

    // Map questions to omit answer and explanation keys
    const studentQuestions = quiz.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      isCode: q.isCode,
      options: q.options
    }));

    res.json({
      id: quiz.id,
      title: quiz.title,
      time_limit: quiz.time_limit,
      questions: studentQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading quiz' });
  }
});

// Submit Quiz answers and violations
app.post('/api/quizzes/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (quizError) throw quizError;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Verify they haven't already taken it
    const { data: existingAttempts } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', req.user.id)
      .eq('quiz_id', quiz.id);

    if (existingAttempts && existingAttempts.length > 0) {
      return res.status(400).json({ message: 'Submission blocked: Quiz already completed' });
    }

    const { answers, violations, status, timeTaken } = req.body;

    // Evaluate Score
    let score = 0;
    const feedbackQuestions = [];

    quiz.questions.forEach((q, index) => {
      const studentAnswer = answers[index]; // integer index
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) score++;

      feedbackQuestions.push({
        questionText: q.questionText,
        isCode: q.isCode,
        options: q.options,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isCorrect
      });
    });

    const violationCount = violations ? violations.length : 0;

    // Insert attempt
    const { error: insertError } = await supabase
      .from('attempts')
      .insert([{
        student_id: req.user.id,
        quiz_id: quiz.id,
        score,
        total_questions: quiz.questions.length,
        answers: answers || [],
        violations: violations || [],
        violation_count: violationCount,
        status: status || 'completed',
        time_taken: timeTaken || 0
      }]);

    if (insertError) throw insertError;

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      violationCount,
      status: status || 'completed',
      feedbackQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during submission' });
  }
});

// --- STUDENT PORTAL ROUTES ---

// Get logged-in student's historical attempts
app.get('/api/student/attempts', authenticateToken, async (req, res) => {
  try {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select(`
        *,
        quizzes:quiz_id (
          title,
          description
        )
      `)
      .eq('student_id', req.user.id)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    res.json(attempts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading student attempts' });
  }
});

// --- ADMIN PORTAL ROUTES ---

// Create new quiz
app.post('/api/admin/quizzes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, questions, timeLimit, assignedDate, startTime, endTime, isActive } = req.body;

    const formattedStart = formatHHMM(startTime, '00:00');
    const formattedEnd = formatHHMM(endTime, '23:59');

    if (formattedStart >= formattedEnd) {
      return res.status(400).json({ message: 'Validation Error: Start Time must be earlier than End Time (e.g. Start 09:00, End 17:00).' });
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        title,
        description: description || '',
        questions: questions || [],
        time_limit: timeLimit || 30,
        assigned_date: assignedDate || getLocalDateString(),
        start_time: formattedStart,
        end_time: formattedEnd,
        is_active: isActive !== undefined ? isActive : true
      }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Quiz created successfully', quiz: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
});

// Get all quizzes in database
app.get('/api/admin/quizzes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading quizzes' });
  }
});

// Delete a quiz
app.delete('/api/admin/quizzes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizId = req.params.id;

    // Delete quiz (attempts will be cascade deleted due to foreign key)
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;

    res.json({ message: 'Quiz and associated attempts deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting quiz' });
  }
});

// Get all registered students
app.get('/api/admin/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading student list' });
  }
});

// Get all student attempts with details for reports
app.get('/api/admin/attempts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select(`
        *,
        users:student_id (
          username,
          email
        ),
        quizzes:quiz_id (
          title
        )
      `)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    res.json(attempts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading admin reports' });
  }
});

// Front-end route handler fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Using Supabase PostgreSQL database`);
});
