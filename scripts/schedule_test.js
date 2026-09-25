const mongoose = require('mongoose');
require('dotenv').config();
const Quiz = require('../models/Quiz');

const questions = [
  {
    questionText: "Who composed the national song 'Vande Mataram'?",
    options: ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Sarojini Naidu", "Subramania Bharati"],
    correctAnswer: 1,
    explanation: "Bankim Chandra Chattopadhyay composed Vande Mataram in Sanskrit in 1870s, which was included in his novel Anandamath."
  },
  {
    questionText: "Which leader is known as 'Netaji'?",
    options: ["Subhas Chandra Bose", "Bhagat Singh", "Dadabhai Naoroji", "Chandrashekhar Azad"],
    correctAnswer: 0,
    explanation: "Subhas Chandra Bose was granted the honorific title 'Netaji' by Indian soldiers of the Azad Hind Fauj."
  },
  {
    questionText: "Which organization was founded by Allan Octavian Hume in 1885?",
    options: ["Indian National Congress", "Home Rule League", "Servants of India Society", "All India Muslim League"],
    correctAnswer: 0,
    explanation: "The Indian National Congress (INC) was founded in December 1885 by A. O. Hume."
  },
  {
    questionText: "What does the term 'Swadeshi' literally mean?",
    options: ["Industrial development", "Self-reliance or of one's own country", "Military power", "Religious unity"],
    correctAnswer: 1,
    explanation: "Swadeshi means 'of one's own country' and emphasizes self-reliance."
  },
  {
    questionText: "Which movement was launched after the partition of Bengal in 1905?",
    options: ["Swadeshi Movement", "Khilafat Movement", "Champaran Satyagraha", "Individual Satyagraha"],
    correctAnswer: 0,
    explanation: "The Swadeshi Movement was formally proclaimed in August 1905 in response to the Partition of Bengal."
  },
  {
    questionText: "Who founded the All India Women's Conference in 1927?",
    options: ["Annie Besant", "Sarojini Naidu", "Aruna Asaf Ali", "Vijayalakshmi Pandit"],
    correctAnswer: 0,
    explanation: "Annie Besant along with Margaret Cousins helped found early national women's organizations leading up to AIWC."
  },
  {
    questionText: "Which freedom fighter was known as the 'Grand Old Man of India'?",
    options: ["Chandrashekhar Azad", "Dadabhai Naoroji", "Gopal Krishna Gokhale", "C. Rajagopalachari"],
    correctAnswer: 1,
    explanation: "Dadabhai Naoroji was known as the 'Grand Old Man of India' for his lifetime contribution to national politics."
  },
  {
    questionText: "Who is remembered as the 'Nightingale of India'?",
    options: ["Sarojini Naidu", "Annie Besant", "Kasturba Gandhi", "Madam Bhikaji Cama"],
    correctAnswer: 0,
    explanation: "Sarojini Naidu was given the title 'Bharat Kokila' or the 'Nightingale of India' by Mahatma Gandhi."
  },
  {
    questionText: "Which leader gave the slogan 'Do or Die' during the Quit India Movement?",
    options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "Subhas Chandra Bose"],
    correctAnswer: 0,
    explanation: "Mahatma Gandhi gave the call 'Do or Die' ('Karo ya Maro') during his speech at Gowalia Tank Maidan in 1942."
  },
  {
    questionText: "What was the main objective of the Non-Cooperation Movement launched in 1920?",
    options: ["To cooperate with British authorities", "To withdraw support from British institutions non-violently", "To establish armed resistance", "To demand partition"],
    correctAnswer: 1,
    explanation: "The movement aimed to withhold cooperation from the British government through non-violent resistance."
  },
  {
    questionText: "Which freedom fighter was involved in the Kakori Train Conspiracy of 1925?",
    options: ["Ram Prasad Bismil", "Madan Mohan Malaviya", "Rajendra Prasad", "Bipin Chandra Pal"],
    correctAnswer: 0,
    explanation: "Ram Prasad Bismil was a leader of the Hindustan Republican Association involved in the Kakori event."
  },
  {
    questionText: "Which leader was popularly known as 'Lokmanya'?",
    options: ["Bal Gangadhar Tilak", "Lala Lajpat Rai", "Gopal Krishna Gokhale", "Dadabhai Naoroji"],
    correctAnswer: 0,
    explanation: "Bal Gangadhar Tilak was honored with the title 'Lokmanya', meaning accepted by the people as their leader."
  },
  {
    questionText: "Which woman freedom fighter hoisted the Indian flag at Gowalia Tank Maidan during Quit India Movement?",
    options: ["Aruna Asaf Ali", "Sarojini Naidu", "Kamaladevi Chattopadhyay", "Sucheta Kripalani"],
    correctAnswer: 0,
    explanation: "Aruna Asaf Ali hoisted the Indian flag at Gowalia Tank Maidan in Bombay during the Quit India Movement in 1942."
  },
  {
    questionText: "Which movement was started in 1942 demanding an end to British rule in India?",
    options: ["Swadeshi Movement", "Quit India Movement", "Khilafat Movement", "Champaran Satyagraha"],
    correctAnswer: 1,
    explanation: "The Quit India Movement was officially launched in August 1942 demanding an immediate end to British rule."
  },
  {
    questionText: "Which principle was central to Mahatma Gandhi's philosophy of resistance?",
    options: ["Armed rebellion", "Nonviolent resistance (Ahimsa)", "Secret political assassination", "Economic boycott only"],
    correctAnswer: 1,
    explanation: "Ahimsa (non-violence) was the fundamental principle of Mahatma Gandhi's philosophy and actions."
  },
  {
    questionText: "Which freedom fighter authored the book 'The First War of Indian Independence'?",
    options: ["Vinayak Damodar Savarkar", "Bhagat Singh", "Rajguru", "Ashfaqulla Khan"],
    correctAnswer: 0,
    explanation: "Veer Vinayak Damodar Savarkar authored 'The Indian War of Independence 1857'."
  },
  {
    questionText: "Which group of nationalist leaders was famously known as 'Lal Bal Pal'?",
    options: ["Mahatma Gandhi, Nehru, & Patel", "Lala Lajpat Rai, Bal Gangadhar Tilak, & Bipin Chandra Pal", "Sardar Patel, Subhas Bose, & Azad", "Dadabhai Naoroji, Gokhale, & Ranade"],
    correctAnswer: 1,
    explanation: "Lal Bal Pal refers to Lala Lajpat Rai, Bal Gangadhar Tilak, and Bipin Chandra Pal."
  },
  {
    questionText: "What was the main purpose of the Dandi March in 1930?",
    options: ["To support British taxes", "To organize Salt Satyagraha against the salt tax monopoly", "To promote industrial growth", "To establish local government"],
    correctAnswer: 1,
    explanation: "The Dandi March was an act of non-violent civil disobedience against the British salt tax monopoly."
  },
  {
    questionText: "Which freedom fighter established the India House in London?",
    options: ["Shyamji Krishna Varma", "Mahatma Gandhi", "Motilal Nehru", "Rajendra Prasad"],
    correctAnswer: 0,
    explanation: "Shyamji Krishna Varma established India House in London as a nationalist organization for Indian students."
  },
  {
    questionText: "Which economic concept was highlighted by Dadabhai Naoroji in his book?",
    options: ["Drain of Wealth theory", "Doctrine of Lapse", "Subsidiary Alliance", "Permanent Settlement"],
    correctAnswer: 0,
    explanation: "Dadabhai Naoroji articulated the 'Drain of Wealth' theory detailing economic exploitation under British rule."
  },
  {
    questionText: "Which leader formed the 'Forward Bloc' party in 1939?",
    options: ["Subhas Chandra Bose", "B. R. Ambedkar", "M. G. Ranade", "Surendranath Banerjee"],
    correctAnswer: 0,
    explanation: "Subhas Chandra Bose founded the All India Forward Bloc in 1939."
  },
  {
    questionText: "Which revolutionary was hanged alongside Bhagat Singh and Rajguru in 1931?",
    options: ["Sukhdev Thapar", "Mahatma Gandhi", "Sardar Patel", "C. Rajagopalachari"],
    correctAnswer: 0,
    explanation: "Sukhdev Thapar was executed alongside Bhagat Singh and Rajguru on 23 March 1931 in Lahore."
  },
  {
    questionText: "Which freedom movement was started to protest against the Rowlatt Act?",
    options: ["Rowlatt Satyagraha / Non-Cooperation", "Subsidiary Alliance", "Doctrine of Lapse", "Permanent Settlement"],
    correctAnswer: 0,
    explanation: "Mahatma Gandhi launched the Rowlatt Satyagraha in 1919 against the repressive Rowlatt Act."
  },
  {
    questionText: "Which statement best describes the Quit India Resolution of 1942?",
    options: ["It demanded an immediate end to British rule in India", "It demanded partial self-rule", "It promoted cooperation with British forces", "It focused only on economic reforms"],
    correctAnswer: 0,
    explanation: "The Quit India Resolution demanded an immediate and complete end to British colonial rule in India."
  }
];

async function scheduleQuiz() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const todayStr = new Date().toISOString().split('T')[0];

    const quizData = {
      title: 'Indian History & Freedom Movement MCQ Test',
      description: 'Evaluation covering key leaders, freedom movements, revolutionary organizations, and milestone events in Indian independence history.',
      timeLimit: 60, // 60 minutes (1 hour)
      assignedDate: todayStr,
      startTime: '00:00',
      endTime: '23:59',
      isActive: true,
      questions: questions
    };

    // Check if test already exists
    const existing = await Quiz.findOne({ title: quizData.title });
    if (existing) {
      console.log('Updating existing test:', existing._id);
      Object.assign(existing, quizData);
      await existing.save();
      console.log('Quiz successfully updated in MongoDB!');
    } else {
      const newQuiz = new Quiz(quizData);
      await newQuiz.save();
      console.log('Quiz successfully created and scheduled in MongoDB! ID:', newQuiz._id);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error scheduling quiz:', err);
    process.exit(1);
  }
}

scheduleQuiz();
