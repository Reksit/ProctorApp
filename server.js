const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Attempt = require('./models/Attempt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully.');
    seedDefaultQuiz();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
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
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or Email already registered' });
    }

    // Assign role based on admin secret code
    let role = 'student';
    const expectedSecret = process.env.ADMIN_SECRET || 'admin123';
    if (adminSecret && adminSecret === expectedSecret) {
      role = 'admin';
    }

    const newUser = new User({
      username,
      email,
      password,
      role
    });

    await newUser.save();
    
    res.status(201).json({ message: 'Registration successful! Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
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
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- QUIZ ROUTES ---

// Get today's assigned quiz for students
app.get('/api/quizzes/today', authenticateToken, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Find quiz active and assigned to today
    let quiz = await Quiz.findOne({ assignedDate: todayStr, isActive: true });
    
    // If no quiz assigned to today specifically, find any active quiz as a fallback
    if (!quiz) {
      quiz = await Quiz.findOne({ isActive: true }).sort({ createdAt: -1 });
    }

    if (!quiz) {
      return res.status(404).json({ message: 'No active quiz available at the moment' });
    }

    // Check if the student has already attempted this quiz
    const attempt = await Attempt.findOne({ student: req.user.id, quiz: quiz._id });
    
    // Time constraints checks
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    let isLocked = false;
    let lockReason = '';

    if (quiz.assignedDate === todayStr) {
      if (quiz.startTime && currentTimeStr < quiz.startTime) {
        isLocked = true;
        lockReason = `Exam window has not opened yet. Starts at ${quiz.startTime}.`;
      } else if (quiz.endTime && currentTimeStr > quiz.endTime) {
        isLocked = true;
        lockReason = `Exam window has closed. The test ended at ${quiz.endTime}.`;
      }
    }

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        totalQuestions: quiz.questions.length,
        startTime: quiz.startTime,
        endTime: quiz.endTime
      },
      alreadyAttempted: !!attempt,
      attemptDetails: attempt,
      isLocked,
      lockReason
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching daily quiz' });
  }
});

// Get quiz questions to take (answers stripped)
app.get('/api/quizzes/:id/take', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.id || req.params.id);
    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ message: 'Quiz not found or inactive' });
    }

    // Verify they haven't already taken it
    const alreadyAttempted = await Attempt.findOne({ student: req.user.id, quiz: quiz._id });
    if (alreadyAttempted) {
      return res.status(400).json({ message: 'You have already completed this quiz' });
    }

    // Time constraints checks
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    if (quiz.assignedDate === todayStr) {
      if (quiz.startTime && currentTimeStr < quiz.startTime) {
        return res.status(400).json({ message: `Access Blocked: This quiz starts at ${quiz.startTime}.` });
      }
      if (quiz.endTime && currentTimeStr > quiz.endTime) {
        return res.status(400).json({ message: `Access Blocked: This quiz ended at ${quiz.endTime}.` });
      }
    }

    // Map questions to omit answer and explanation keys
    const studentQuestions = quiz.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      isCode: q.isCode,
      options: q.options
    }));

    res.json({
      id: quiz._id,
      title: quiz.title,
      timeLimit: quiz.timeLimit,
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
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Verify they haven't already taken it
    const alreadyAttempted = await Attempt.findOne({ student: req.user.id, quiz: quiz._id });
    if (alreadyAttempted) {
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

    const newAttempt = new Attempt({
      student: req.user.id,
      quiz: quiz._id,
      score,
      totalQuestions: quiz.questions.length,
      answers,
      violations: violations || [],
      violationCount,
      status: status || 'completed',
      timeTaken: timeTaken || 0
    });

    await newAttempt.save();

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      violationCount,
      status: newAttempt.status,
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
    const attempts = await Attempt.find({ student: req.user.id })
      .populate('quiz', 'title description')
      .sort({ completedAt: -1 });
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
    
    const newQuiz = new Quiz({
      title,
      description,
      questions,
      timeLimit,
      assignedDate,
      startTime: startTime || '00:00',
      endTime: endTime || '23:59',
      isActive: isActive !== undefined ? isActive : true
    });

    await newQuiz.save();
    res.status(201).json({ message: 'Quiz created successfully', quiz: newQuiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
});

// Get all quizzes in database
app.get('/api/admin/quizzes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error loading quizzes' });
  }
});

// Get all student attempts with details for reports
app.get('/api/admin/attempts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const attempts = await Attempt.find()
      .populate('student', 'username email')
      .populate('quiz', 'title')
      .sort({ completedAt: -1 });
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
  console.log(`Server running on port ${PORT}`);
});

// --- SEED DEFAULT JAVA OOP MCQS ---
async function seedDefaultQuiz() {
  try {
    const quizCount = await Quiz.countDocuments();
    if (quizCount > 0) {
      console.log('Quiz database already has data. Skipping default seeding.');
      return;
    }

    console.log('Seeding default Java OOP MCQs...');
    const todayStr = new Date().toISOString().split('T')[0];

    const defaultQuiz = new Quiz({
      title: 'Java OOP Aptitude & Challenge Quiz',
      description: 'Comprehensive evaluation of Java Object-Oriented Programming concepts, runtime dispatching, static binding, inheritance, constructor rules, and interface standards. Formulated for aptitude and technical rounds.',
      timeLimit: 30, // 30 minutes
      assignedDate: todayStr,
      isActive: true,
      questions: [
        {
          questionText: 'Which OOP principle allows one interface to have multiple implementations?',
          options: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'],
          correctAnswer: 2,
          explanation: 'Polymorphism (specifically subtype polymorphism or interface implementation) enables one interface to represent multiple distinct execution behaviors.'
        },
        {
          questionText: 'Which keyword is used to prevent a class from being inherited?',
          options: ['static', 'private', 'final', 'abstract'],
          correctAnswer: 2,
          explanation: 'The final keyword in a class declaration prevents any class from subclassing/inheriting it (e.g., public final class String).'
        },
        {
          questionText: 'Which of the following is NOT an OOP principle?',
          options: ['Inheritance', 'Encapsulation', 'Compilation', 'Polymorphism'],
          correctAnswer: 2,
          explanation: 'Compilation is a process performed by the compiler to translate source code into bytecode/machine code; it is not a concept of object-oriented design.'
        },
        {
          questionText: 'Which keyword is used to inherit a class?',
          options: ['implements', 'extends', 'inherit', 'super'],
          correctAnswer: 1,
          explanation: 'The extends keyword is used in Java to create a subclass that inherits variables and methods from a parent class.'
        },
        {
          questionText: 'Which feature allows the same method name with different parameter lists?',
          options: ['Method Overriding', 'Method Overloading', 'Abstraction', 'Encapsulation'],
          correctAnswer: 1,
          explanation: 'Method Overloading allows a class to have multiple methods with the same name, provided their parameter lists (signatures) are different (compile-time polymorphism).'
        },
        {
          questionText: 'Which statement about constructors is TRUE?',
          options: [
            'Constructors have return types.',
            'Constructors can be inherited.',
            'Constructors have the same name as the class.',
            'Constructors can be abstract.'
          ],
          correctAnswer: 2,
          explanation: 'Constructors must share the exact name as the class declaration. They do not have return types, cannot be inherited, and cannot be abstract.'
        },
        {
          questionText: 'Which keyword refers to the current object?',
          options: ['current', 'self', 'this', 'object'],
          correctAnswer: 2,
          explanation: 'The this keyword is a reference variable in Java that refers directly to the current instance of the class.'
        },
        {
          questionText: 'Which keyword refers to the parent class object or members?',
          options: ['parent', 'base', 'super', 'this'],
          correctAnswer: 2,
          explanation: 'The super keyword is used in subclasses to reference members (variables or methods) or constructors of the immediate parent class.'
        },
        {
          questionText: 'Which access modifier gives access only within the same class?',
          options: ['public', 'protected', 'private', 'default'],
          correctAnswer: 2,
          explanation: 'Private members are accessible exclusively within the body of the class they are declared in.'
        },
        {
          questionText: 'Which class cannot be instantiated?',
          options: ['Static class', 'Abstract class', 'Final class', 'Normal class'],
          correctAnswer: 1,
          explanation: 'An abstract class is intended as a blueprint and cannot be instantiated with the new operator directly.'
        },
        {
          questionText: 'Which method is called automatically during object creation?',
          options: ['main()', 'finalize()', 'Constructor', 'init()'],
          correctAnswer: 2,
          explanation: 'A constructor is invoked automatically when a new instance of a class is allocated with the new operator.'
        },
        {
          questionText: 'What is runtime polymorphism achieved through?',
          options: ['Method Overloading', 'Constructor Overloading', 'Method Overriding', 'Interfaces only'],
          correctAnswer: 2,
          explanation: 'Runtime polymorphism (dynamic method dispatch) is resolved at runtime based on the actual object type, which is achieved via Method Overriding.'
        },
        {
          questionText: 'Which keyword is mandatory while overriding a method?',
          options: ['super', 'final', 'override', 'None'],
          correctAnswer: 3,
          explanation: 'No keyword is mandatory to override a method, although the @Override annotation is strongly recommended to enable compiler checks.'
        },
        {
          questionText: 'Which statement is TRUE?',
          options: [
            'A final method can be overridden.',
            'A static method can be overridden.',
            'A private method can be overridden.',
            'None of the above.'
          ],
          correctAnswer: 3,
          explanation: 'None of these can be overridden. final prevents overriding, static methods are hidden rather than overridden, and private methods are not visible in subclasses.'
        },
        {
          questionText: 'Which concept hides implementation details from users?',
          options: ['Encapsulation', 'Inheritance', 'Abstraction', 'Polymorphism'],
          correctAnswer: 2,
          explanation: 'Abstraction is the design pattern of hiding internal execution details and exposing only the functional interface to the user.'
        },
        {
          questionText: 'Which keyword is used to create an object?',
          options: ['create', 'object', 'new', 'alloc'],
          correctAnswer: 2,
          explanation: 'The new keyword is used in Java to allocate heap memory for a new object and trigger its constructor.'
        },
        {
          questionText: 'Which of the following supports multiple inheritance in Java?',
          options: ['Classes', 'Interfaces', 'Constructors', 'Objects'],
          correctAnswer: 1,
          explanation: 'Java classes do not support multiple inheritance of implementation to avoid the Diamond Problem, but interfaces support multiple inheritance of type.'
        },
        {
          questionText: 'Which is NOT true about interfaces?',
          options: [
            'They support abstraction.',
            'Objects cannot be created directly.',
            'They can have default methods.',
            'They can have constructors.'
          ],
          correctAnswer: 3,
          explanation: 'Interfaces cannot have constructors because they cannot hold instance state and are not intended to be instantiated directly.'
        },
        {
          questionText: 'Which access modifier allows visibility everywhere?',
          options: ['private', 'protected', 'default', 'public'],
          correctAnswer: 3,
          explanation: 'The public modifier grants access to the member from any package or class in the application.'
        },
        {
          questionText: 'Which keyword prevents method overriding?',
          options: ['static', 'final', 'abstract', 'native'],
          correctAnswer: 1,
          explanation: 'Marking a method as final prevents subclass declarations from overriding it.'
        },
        {
          questionText: `Consider the following Java code:

class Animal {
    void sound() {
        System.out.println("Animal");
    }
}

class Dog extends Animal {
    void sound() {
        System.out.println("Dog");
    }
}

public class Test {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.sound();
    }
}`,
          isCode: true,
          options: ['Animal', 'Dog', 'Compilation Error', 'Runtime Error'],
          correctAnswer: 1,
          explanation: 'This is an example of Dynamic Method Dispatch. Since the runtime object refers to an instance of Dog, Dog\'s sound() method is resolved and executed.'
        },
        {
          questionText: `What will be the output of this code?

class Test {
    Test() {
        System.out.print("A ");
    }

    Test(int x) {
        this();
        System.out.print("B");
    }

    public static void main(String args[]) {
        new Test(10);
    }
}`,
          isCode: true,
          options: ['B A', 'A B', 'A', 'Compilation Error'],
          correctAnswer: 1,
          explanation: 'new Test(10) calls the single-parameter constructor, which immediately delegates to Test() using this(). Test() prints "A ", then execution returns to Test(int x) which prints "B".'
        },
        {
          questionText: 'Which constructor is called first during object creation in inheritance hierarchy?',
          options: ['Child Constructor', 'Parent Constructor', 'Random', 'Depends on JVM'],
          correctAnswer: 1,
          explanation: 'When a Child object is created, its constructor runs. However, the first statement in a child constructor is an implicit or explicit super() call, meaning the Parent Constructor completes execution first.'
        },
        {
          questionText: `What will be the output of this code?

class A {
    static void display() {
        System.out.print("A");
    }
}

class B extends A {
    static void display() {
        System.out.print("B");
    }
}

public class Test {
    public static void main(String[] args) {
        A obj = new B();
        obj.display();
    }
}`,
          isCode: true,
          options: ['A', 'B', 'AB', 'Compilation Error'],
          correctAnswer: 0,
          explanation: 'Static methods are not polymorphic; they undergo compile-time static binding. Since the declared class reference type is A, the static display() of class A is executed.'
        },
        {
          questionText: 'Which statement best describes encapsulation?',
          options: [
            'Writing multiple methods with the same name.',
            'Binding data (variables) and methods into a single unit while restricting direct access.',
            'Acquiring properties from another class.',
            'Hiding implementation using abstract classes.'
          ],
          correctAnswer: 1,
          explanation: 'Encapsulation is the process of bundling data fields and methods operating on that data inside a class, using private modifiers and getter/setter accessors to control data integrity.'
        },
        {
          questionText: 'Can a class constructor in Java be declared as final?',
          options: ['Yes', 'No'],
          correctAnswer: 1,
          explanation: 'Constructors cannot be final. Marking something final prevents it from being overridden, and since constructors are not inherited or overridden in the first place, declaring a constructor final results in a compilation error.'
        },
        {
          questionText: 'Can an abstract class have a constructor defined inside it?',
          options: ['Yes', 'No'],
          correctAnswer: 0,
          explanation: 'Yes, an abstract class can have constructors. They are called via super() from subclasses when instantiating concrete child classes, and are useful for initializing fields declared in the abstract class.'
        },
        {
          questionText: 'Which of the following methods cannot be overridden in subclasses?',
          options: ['final methods', 'private methods', 'static methods', 'All of the above'],
          correctAnswer: 3,
          explanation: 'All three options are correct. final explicitly locks overriding, private methods are hidden from subclasses, and static methods undergo compile-time static binding (method hiding, not overriding).'
        },
        {
          questionText: 'Which of these concepts supports dynamic method dispatch in Java?',
          options: ['Method Overloading', 'Method Overriding', 'Constructor Chaining', 'Interfaces only'],
          correctAnswer: 1,
          explanation: 'Dynamic method dispatch is the mechanism by which a call to an overridden method is resolved at runtime. Therefore, it requires method overriding.'
        },
        {
          questionText: `Which OOP concept does the following statement demonstrate?

Object obj = new String("Hello");`,
          isCode: true,
          options: ['Upcasting', 'Downcasting', 'Constructor Chaining', 'Boxing'],
          correctAnswer: 0,
          explanation: 'Assigning a subclass reference (String) to a parent class/interface reference (Object) is called Upcasting, which is done implicitly in Java.'
        }
      ]
    });

    await defaultQuiz.save();
    console.log('Default Java OOP Quiz successfully seeded!');
  } catch (err) {
    console.error('Error seeding default quiz:', err);
  }
}
