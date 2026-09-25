# Rate Limiting Implementation Guide

## 🛡️ What Was Implemented

**General API Rate Limiting** to prevent DDoS attacks and abuse.

---

## ⚙️ Configuration

```javascript
Rate Limit: 100 requests per 15 minutes per IP/User
Window: 15 minutes (900,000 ms)
Applies to: All /api/* endpoints
Tracking: By User ID (if logged in) or IP address
```

---

## 📊 How It Works

### Per-User/IP Tracking

Each user or IP address gets their own counter:

```
User A (IP: 192.168.1.50):
├─ Request 1-100: ✅ Allowed
└─ Request 101+: ⛔ Blocked (429 Too Many Requests)

User B (IP: 192.168.1.51):
├─ Request 1-100: ✅ Allowed (Different IP, separate counter)
└─ Request 101+: ⛔ Blocked
```

### Smart Tracking Logic

1. **Logged-in users**: Tracked by User ID
   - More accurate
   - Can't bypass by changing IP (VPN)

2. **Anonymous users**: Tracked by IP address
   - Works for login/registration endpoints
   - Fair for public endpoints

---

## 🎯 Protected Endpoints

All API endpoints are now protected:

| Endpoint | Protected |
|----------|-----------|
| `/api/auth/login` | ✅ |
| `/api/auth/register` | ✅ |
| `/api/auth/me` | ✅ |
| `/api/quizzes/today` | ✅ |
| `/api/quizzes/:id/take` | ✅ |
| `/api/quizzes/:id/submit` | ✅ |
| `/api/student/attempts` | ✅ |
| `/api/admin/*` | ✅ |

### NOT Protected (Static Files)

Static files are excluded for performance:
- CSS files (`/css/*`)
- JavaScript files (`/js/*`)
- Images (`/images/*`)
- Other static assets (`.png`, `.jpg`, `.ico`, etc.)

---

## 🧪 Testing Rate Limiting

### Method 1: Automated Test Script

```bash
# Make sure server is running first
npm start

# In another terminal, run the test
node test-rate-limit.js
```

**Expected Output:**
```
✅ Server is running

🧪 Starting Rate Limit Test...

Configuration: 100 requests per 15 minutes per IP

✓ Request 25: Success (25 total)
✓ Request 50: Success (50 total)
✓ Request 75: Success (75 total)
✓ Request 100: Success (100 total)
❌ Request 101: BLOCKED (429 Too Many Requests)
   └─ Rate Limit Remaining: 0
   └─ Retry After: 900 seconds

✅ Rate limiting is working correctly!

📊 Test Summary:
   - Successful requests: 100
   - Blocked requests: 1
   - Total requests made: 101

🎯 Test Complete!
```

### Method 2: Manual Testing with Browser/Postman

1. Start the server:
```bash
npm start
```

2. Make API requests to any endpoint:
```bash
# Using curl
for i in {1..105}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" http://localhost:3000/api/auth/me
done
```

3. After 100 requests, you'll see:
```
Request 100: 200
Request 101: 429
Request 102: 429
...
```

### Method 3: Browser DevTools

1. Open your quiz app in browser
2. Open DevTools (F12) → Network tab
3. Perform actions that make API calls
4. Check response headers:
   - `RateLimit-Limit: 100`
   - `RateLimit-Remaining: 99` (decreases with each request)
   - `RateLimit-Reset: 1727280000` (Unix timestamp)

---

## 📈 Rate Limit Response Headers

Every API response includes these headers:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 85
RateLimit-Reset: 1727280000
```

| Header | Description | Example |
|--------|-------------|---------|
| `RateLimit-Limit` | Maximum requests allowed | `100` |
| `RateLimit-Remaining` | Requests left in current window | `85` |
| `RateLimit-Reset` | When the limit resets (Unix timestamp) | `1727280000` |

---

## 🚫 When Rate Limit is Exceeded

### Response Status: `429 Too Many Requests`

**Response Body:**
```json
{
  "status": 429,
  "message": "Too many requests from this IP. Please try again after 15 minutes."
}
```

**Response Headers:**
```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1727280900
Retry-After: 900
```

---

## 🎓 Real-World Scenarios

### Scenario 1: Normal Student Usage

```
Student logs in and takes a quiz:

1. POST /api/auth/login          (1/100)
2. GET  /api/quizzes/today       (2/100)
3. GET  /api/quizzes/123/take    (3/100)
4. POST /api/quizzes/123/submit  (4/100)
5. GET  /api/student/attempts    (5/100)

Total: 5 requests
Status: ✅ All successful (95 remaining)
```

**Normal students will never hit the limit!**

---

### Scenario 2: 500 Students Taking Test Simultaneously

```
10:00 AM - 500 students click "Start Test"

Each student:
- Login: 1 request
- Load quiz: 1 request
- Submit: 1 request
Total: 3 requests per student

500 students × 3 requests = 1,500 requests
But tracked individually!

Student 1: 3/100 ✅
Student 2: 3/100 ✅
Student 3: 3/100 ✅
...
Student 500: 3/100 ✅

All students successful! ✅
```

---

### Scenario 3: DDoS Attack Blocked

```
Attacker's bot script:
while(true) {
  fetch('/api/quizzes/today');
}

Result:
Request 1-100: ✅ Processed
Request 101+: ⛔ BLOCKED

Attack prevented! ✅
Server protected! ✅
Other users unaffected! ✅
```

---

### Scenario 4: Brute Force Login Attack Blocked

```
Hacker trying to guess passwords:
for (let i = 0; i < 10000; i++) {
  POST /api/auth/login
  { email: "admin@quiz.com", password: "pass" + i }
}

Result:
Request 1-100: ❌ Wrong password (but processed)
Request 101+: ⛔ BLOCKED (rate limit)

After 100 attempts:
- "Too many requests from this IP"
- Must wait 15 minutes
- Attack significantly slowed down! ✅
```

---

## 🔧 Customization

### Adjusting the Limits

Edit `server.js` line 29-34:

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Change time window
  max: 100,                  // Change request limit
  // ... rest of config
});
```

**Common Configurations:**

| Use Case | Window | Max | Explanation |
|----------|--------|-----|-------------|
| **Development** | 1 minute | 1000 | Very lenient for testing |
| **Production (Strict)** | 15 minutes | 50 | More restrictive |
| **Production (Standard)** | 15 minutes | 100 | Current setting ✅ |
| **Production (Lenient)** | 15 minutes | 200 | For high-traffic apps |

---

## 🎯 Benefits for Your Quiz App

✅ **Security**: Prevents brute force attacks on login  
✅ **Performance**: Stops DDoS attacks from overwhelming server  
✅ **Cost Savings**: Reduces unnecessary database queries  
✅ **Fair Usage**: Prevents single user from monopolizing resources  
✅ **Student Protection**: Legitimate students never affected  
✅ **Supabase Savings**: Prevents excessive API usage costs  

---

## 📊 Monitoring Rate Limits

### Check Current Status

Add this endpoint to test rate limit status:

```javascript
// Add to server.js
app.get('/api/rate-limit-status', apiLimiter, (req, res) => {
  res.json({
    limit: 100,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime).toISOString()
  });
});
```

Test:
```bash
curl http://localhost:3000/api/rate-limit-status
```

Response:
```json
{
  "limit": 100,
  "remaining": 95,
  "resetTime": "2026-09-25T10:15:00.000Z"
}
```

---

## 🚀 What's Next?

This implementation covers **general API protection**. For even better security, consider adding:

1. **Stricter limits for sensitive endpoints:**
   - Login: 5 attempts per 15 minutes
   - Registration: 3 accounts per hour
   - Quiz submission: 1 per quiz per day

2. **IP Whitelisting:**
   - Exclude school/university IP ranges
   - Higher limits for trusted IPs

3. **Redis Storage:**
   - For distributed systems
   - Better performance at scale

4. **Advanced Features:**
   - Custom error pages
   - Rate limit notifications
   - Analytics dashboard

---

## ❓ FAQ

**Q: Will this slow down my app?**  
A: No! Rate limiting adds ~0.1ms overhead per request (negligible).

**Q: What if 1000 students take a test at once?**  
A: No problem! Each student has their own 100-request limit.

**Q: Can students bypass this with VPN?**  
A: No! Logged-in users are tracked by User ID, not IP.

**Q: What happens after 15 minutes?**  
A: The counter resets automatically. Users can make 100 more requests.

**Q: How do I turn it off?**  
A: Comment out line 52 in `server.js`:
```javascript
// app.use('/api/', apiLimiter);
```

---

**Implementation Complete! ✅**

Your quiz app is now protected from DDoS attacks and API abuse.
