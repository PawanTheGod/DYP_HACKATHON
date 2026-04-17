> **MCP Server connected**: https://gitmcp.io/aatmman/smart_study_planner

I'll analyze the StudyOS PRD and break down tasks for 4 people with exact deliverables and detailed prompts.I understand. You need a **detailed 4-person task breakdown** for the StudyOS hackathon build with explicit deliverables and coding prompts for each person. Let me create this:

---

# **STUDYOS — 4-PERSON TEAM BREAKDOWN**
## 12-Hour Hackathon Build Plan

**Team Members:** Person 1, Person 2, Person 3, Person 4  
**Target:** Working MVP with all 6 phases  
**Current Date:** 2026-04-17

---

## **PERSON 1: AI & Backend Logic Specialist**

### **Role:** qrok API Integration, Sage Personality System, Core Logic

---

### **Task 1.1 — Build the Sage System Prompt Factory**

**Deliverable:** A reusable JavaScript/TypeScript module that generates system prompts for every qrok API call, with user context injected.

**Exact Prompt to Code With:**
> "Create a TypeScript file named `sageSystemPrompt.ts`. Export a function `generateSagePrompt(userProfile, contextType)` that:
> 1. Takes userProfile object (from Firebase) with fields: name, motivation, subjects[], examDates[], streakCount, energyPeak
> 2. Takes contextType as one of: 'schedule_gen', 'check_in', 'companion_chat', 'verification', 'emergency'
> 3. Returns a complete system prompt string that:
>    - Inserts {{userName}}, {{motivation}}, {{subjectList}}, {{examDates}}, {{streakCount}}, {{energyPeak}} placeholders with actual values
>    - Includes the FULL Sage character sheet from section 9.3 of the PRD
>    - Appends context-specific instructions at the end (e.g., for 'schedule_gen': 'Return ONLY a valid JSON array, no explanation')
>    - Ensures no prompt injection by sanitizing user inputs (remove special chars from name, motivation)
> 4. Returns the complete prompt as a string ready to be used as the 'system' parameter in qrok API calls
> Use Groq SDK: import Groq from '@Groq-ai/sdk'. Write comments explaining each template variable."

**File to Create:** `src/lib/sageSystemPrompt.ts`

**Key Implementation Details:**
```
- Placeholder format: {{fieldName}}
- For subjects list: "Subjects: [ThermodynamicsL 8/10 difficulty, DBMS: 5/10 difficulty, ...]"
- For motivation: include exact user quote
- For examDates: format as "Thermodynamics: May 10, DBMS: May 12, ..."
- Sanitize: remove quotes, semicolons, newlines from user inputs before injection
```

---

### **Task 1.2 — Implement Onboarding Chat → Data Extraction Pipeline**

**Deliverable:** A function that runs a multi-turn qrok conversation, then calls a second qrok API to parse the conversation into structured JSON userProfile.

**Exact Prompt to Code With:**
> "Create `src/lib/onboardingPipeline.ts` with two exported async functions:
> 
> **Function A: `runOnboardingChat(onUserMessage: (msg) => void)`**
> - Maintains a chat history array: messages[] = []
> - First message: Sage opens with: 'Hi! I'm Sage, your study partner. Let me understand your situation so I can build you the perfect schedule. What subjects are you preparing for right now? Be specific — tell me the names and how many you have.'
> - For each user input (passed via onUserMessage), add to messages[], call qrok API with:
>   - system: generateSagePrompt(null, 'onboarding')
>   - user: last message
> - Sage responds naturally, tracking extracted data points: subjects (names), exams (dates), constraints (sleep, blocked hours), motivation (why)
> - After detecting all key data gathered (4+ exchanges), add a summary message: 'Great! Let me confirm: [list of extracted data]. Anything I got wrong?'
> - User confirms → return the full chat history (messages[])
> 
> **Function B: `parseOnboardingChat(chatHistory) → Promise<UserProfile>`**
> - Takes the messages[] array from Function A
> - Calls qrok API with:
>   - system: 'You are a JSON extraction bot. Parse the onboarding chat below into the exact JSON structure provided. Return ONLY valid JSON, no markdown.'
>   - user: Full chat transcript + the UserProfile JSON schema (from section 10 of PRD)
> - qrok returns structured UserProfile JSON
> - Validate that all required fields exist; if missing, throw error with message of what's missing
> - Return the validated UserProfile object
> 
> **Implementation notes:**
> - Use Groq SDK with streaming disabled (regular API, not streaming)
> - Handle API timeouts with retry logic (max 3 retries)
> - Store both functions for export to React component
> - Add TypeScript types for all parameters"

**File to Create:** `src/lib/onboardingPipeline.ts`

**Additional Details:**
```
- Conversation loop should run until all fields detected: subjects, deadlines, difficulty ratings, sleep/wake times, available hours, motivation phrase
- If user says 'skip' or 'I don't know', use sensible defaults (e.g., "Weekday: 4 hours, Weekend: 7 hours")
- Sage asks follow-up questions naturally: "You mentioned Thermodynamics — on a scale of 1 to 10, how hard is it for you personally? And when's your exam?"
- Chat limit: 15 turns maximum before forcing summary
- Store raw chat history in Firebase under key: 'onboarding_chat_history'
```

---

### **Task 1.3 — Build Schedule Generation Engine**

**Deliverable:** A function that takes userProfile and calls qrok to generate a prioritized, constraint-aware study schedule for the next 2 weeks.

**Exact Prompt to Code With:**
> "Create `src/lib/scheduleGenerator.ts` with an exported async function `generateSchedule(userProfile, daysAhead = 14) → Promise<ScheduleBlock[]>`:
> 
> The function must:
> 
> 1. **Calculate Priority Scores** for each subject:
>    - For each subject in userProfile.subjects[]:
>      - deadlineUrgency = max(0, 1 - (daysTillDeadline / daysAhead))
>      - difficulty = subject.difficulty / 10
>      - currentGap = (10 - subject.currentLevel) / 10
>      - motivationBoost = (subject.name in userProfile.motivation) ? 1.2 : 1.0
>      - priorityScore = (deadlineUrgency × 0.4) + (difficulty × 0.3) + (currentGap × 0.2) + (motivationBoost × 0.1)
>    - Store each subject's priorityScore in an array
> 
> 2. **Build the qrok Prompt:**
>    - system: generateSagePrompt(userProfile, 'schedule_gen')
>    - user message includes:
>      - Full userProfile JSON
>      - Priority scores for each subject
>      - Format instruction: 'Generate a 14-day study schedule. Return ONLY a valid JSON array of ScheduleBlock objects (see schema). No explanations, no markdown.'
>      - ScheduleBlock schema: { id, subjectId, subject, date, startTime, endTime, type, topic, status, proofVerified, notes }
>      - Constraints to enforce:
>        * Respect sleep hours (block slots outside wakeAt to sleepBy)
>        * Block all time in blockedSlots (college classes, labs)
>        * Never schedule on breakDays
>        * Allocate proportionally by priorityScore (higher score = more blocks)
>        * Schedule high-difficulty subjects during energyPeak hours
>        * For completed topics: auto-insert revision slots at +1, +3, +7, +14 days
>        * Max hours per day: weekday = availableHours.weekday, weekend = availableHours.weekend
> 
> 3. **API Call:**
>    - Use Groq SDK, max_tokens = 4000
>    - Temperature = 0.7 (balanced determinism + creativity)
>    - Timeout: 30 seconds
>    - On timeout: throw error 'Schedule generation timeout'
> 
> 4. **Parse Response:**
>    - Extract the JSON array from response.content[0].text
>    - Validate each block has required fields
>    - If any block missing startTime/endTime, reject the entire response
>    - Validate no overlaps: for each date, check startTime < endTime for all blocks
>    - If overlaps found, call qrok again with: 'The schedule has time conflicts. Fix overlaps and return corrected JSON.'
> 
> 5. **Return:**
>    - Return validated ScheduleBlock[] array
>    - Also auto-save to Firebase under key: 'schedule_blocks_' + today's date
>    - Return also includes metadata: { generatedAt: ISO timestamp, daysAhead, totalBlocksGenerated }"

**File to Create:** `src/lib/scheduleGenerator.ts`

**Additional Implementation Details:**
```
- Block ID format: 'block_' + date + '_' + subjectId + '_' + randomString(4)
- Each block type ratios (for qrok to understand):
  * new_content: 60-70 mins, 60% of high-priority subjects
  * revision: 30-40 mins, 25% for completed topics
  * practice: 45-60 mins, 15% for topics near exam
  * crunch: 90-120 mins, only if exam < 3 days away
  * break: placeholder slots, don't count toward study hours
- Forgetting curve implementation: after block marked 'completed', insert revision blocks at +1, +3, +7, +14 days automatically
- Energy peak allocation: if energyPeak = 'morning', schedule subjects with difficulty >= 7 in 07:00-12:00 window
- Exam crunch mode trigger: if any exam within 3 days, switch that subject to 70% revision blocks
- qrok should distribute ~60% of available hours to top-priority subject, 25% to second, 15% to third+
```

---

### **Task 1.4 — Cascade Rescheduler (Missed Session Handler)**

**Deliverable:** A function that detects missed/skipped sessions and regenerates the schedule to redistribute missed content.

**Exact Prompt to Code With:**
> "Create `src/lib/cascadeRescheduler.ts` with an exported async function `rescheduleAfterMiss(blockId, currentScheduleBlocks, userProfile) → Promise<ScheduleBlock[]>`:
> 
> The function must:
> 
> 1. **Detect the Missed Block:**
>    - Find blockId in currentScheduleBlocks
>    - Extract: subject, topic, duration (endTime - startTime), date
>    - If block status !== 'missed', throw error 'Block not marked as missed'
> 
> 2. **Analyze Impact:**
>    - Count total missed blocks in last 3 days
>    - If count >= 3: set recoveryMode = true
>    - Calculate exam distance for missed block's subject: daysTillExam
> 
> 3. **Build Redistribution Prompt:**
>    - system: generateSagePrompt(userProfile, 'cascade_reschedule')
>    - user message:
>      'The student missed a [topic] session on [date] for [subject]. 
>       This topic needs [duration] minutes of study.
>       Their exam is [daysTillExam] days away.
>       Current remaining schedule: [JSON of future blocks only, non-completed].
>       Redistribute the missed [topic] across the next [daysTillExam] days without exceeding [maxHoursPerDay].
>       If recoveryMode=true, reduce next 2 days by 40%. 
>       Return ONLY corrected ScheduleBlock[] JSON, no explanation.'
> 
> 4. **API Call:**
>    - Call qrok with the prompt
>    - max_tokens = 3000
>    - Temperature = 0.5 (deterministic, follow constraints)
> 
> 5. **Merge Results:**
>    - Remove the missed block from currentScheduleBlocks
>    - Add all new blocks from qrok response
>    - Re-validate for time overlaps
>    - Sort by date + startTime
>    - Return merged array
> 
> 6. **Side Effects:**
>    - Update Firebase: 'schedule_blocks_' + today
>    - Log to completionLog: { blockId, action: 'missed_redistributed', timestamp, newBlocksCount }
>    - If recoveryMode triggered, add companion message to show user: 'I noticed you've had a rough stretch. I've eased your load for the next 2 days.'"

**File to Create:** `src/lib/cascadeRescheduler.ts`

**Additional Details:**
```
- Recovery mode logic: if missed >= 3 in rolling 3-day window, auto-enable
- Recovery mode effects: 
  * Reduce each of next 2 days' total hours by 40%
  * Switch all blocks to type: 'revision' or 'break' (no new content)
  * No exams within those 2 days (shift them if needed)
- Burnout detection message (return to UI): "Burnout detected. Reducing load for 2 days. You're still on track. Rest up."
- The function should be called every time a block status changes to 'missed'
- Store originalSchedule before redistribution so UI can show "before/after" if user requests
```

---

### **Task 1.5 — Proof Verification Engine**

**Deliverable:** Functions to verify study session proofs (photo, quiz, voice) using qrok vision.

**Exact Prompt to Code With:**
> "Create `src/lib/proofVerifier.ts` with three exported async functions:
> 
> **Function A: `verifyPhotoProof(imageBase64, subject, topic) → Promise<{ verified: boolean, confidence: 0-1, feedback: string }>`**
> - Takes base64-encoded image
> - Calls qrok API with vision: format = image/jpeg (or detect from data)
> - System: generateSagePrompt(null, 'verification')
> - User message: '[Image] Does this image show evidence of studying [subject] — specifically [topic]? Analyze for: textbook visibility, handwritten notes, problem solutions, open laptop screen, relevant materials. Return JSON: { verified: true/false, confidence: 0-1 (0=completely fake, 1=definitely studying), feedback: brief 1-sentence explanation }'
> - Parse response JSON, validate fields
> - Return as { verified, confidence, feedback }
> 
> **Function B: `generateQuickQuiz(subject, topic, difficulty) → Promise<{ questions: QuizQuestion[] }>`**
> - subject, topic: strings
> - difficulty: 1-10 number
> - Calls qrok API
> - System: generateSagePrompt(null, 'verification')
> - User message: 'Generate 3 multiple-choice assessment questions to test understanding of [topic] in [subject]. Difficulty level: [difficulty]/10. Each question format: { question: string, optionsA-D: string[], correctAnswerKey: 'A'|'B'|'C'|'D', explanation: string }. Return ONLY JSON array, no markdown.'
> - Parse response, validate structure
> - Return { questions: [...] }
> 
> **Function C: `gradeQuizAnswers(subject, topic, questions, userAnswers) → Promise<{ score: 0-100, feedback: string, incorrectExplanations: string[] }>`**
> - questions: array of quiz questions with correctAnswerKey
> - userAnswers: array of user's selected keys ('A', 'B', etc.)
> - Calls qrok API
> - System: generateSagePrompt(null, 'verification')
> - User message: 'Grade these quiz answers for [topic] in [subject]. Questions: [JSON]. Student answers: [array]. Return: { correctCount, totalCount, score (as percentage), briefFeedback, explanations for each incorrect answer }. Return ONLY JSON, no markdown.'
> - Calculate score = (correctCount / totalCount) * 100
> - Return { score, feedback, incorrectExplanations: [...] }
> 
> **Implementation Notes:**
> - Image handling: if image is File object, convert to base64 using FileReader API
> - API calls use vision-enabled qrok model (qrok-3-5-sonnet is safe choice)
> - Timeout for each function: 20 seconds
> - Store all verification results in completionLog with: { blockId, proofType, proofScore, timestamp }
> - If verification fails (API error), degrade gracefully: auto-verify with confidence=0.5"

**File to Create:** `src/lib/proofVerifier.ts`

**Additional Details:**
```
- Photo verification confidence scoring:
  * 0.8-1.0: textbooks, clear notes, problem solutions visible
  * 0.5-0.7: blurry, partial evidence, device screen hard to confirm
  * 0.2-0.4: suspicious (blank paper, random objects)
  * 0.0-0.2: obviously fake
- Quiz difficulty auto-scales: if subject.difficulty = 8, generate corresponding hard questions
- Store quiz results separately: completionLog tracks score per session
- These scores feed into subject's masteryScore calculation
```

---

### **Task 1.6 — Daily Check-In Engine**

**Deliverable:** A function that generates personalized morning check-in messages and adjusts today's schedule based on energy level.

**Exact Prompt to Code With:**
> "Create `src/lib/dailyCheckIn.ts` with an exported async function `generateCheckInAndAdjust(userProfile, todaySchedule) → Promise<{ checkInMessage: string, adjustedSchedule: ScheduleBlock[], energyLevel: 1-5 }>`
> 
> This is a two-part process:
> 
> **Part 1: Generate Check-In Opening Message**
> - system: generateSagePrompt(userProfile, 'check_in')
> - user: 'Generate a warm, natural morning greeting for [userName]. Today they have [X] hours of study scheduled. Their next exam is [Y] days away. Motivation: [motivation]. Ask them two things: 1) Rate your energy 1-5. 2) Any blockers or things on your mind? Keep it to 3 sentences max.'
> - qrok generates natural greeting, return the message string
> 
> **Part 2: Listen for Energy Response**
> - Wait for user input with energyLevel (1-5) and optional blocker text
> - If energyLevel == 1-2: call qrok with 'Reduce today's schedule by 50%. Replace with light revision and breaks. Keep only the most urgent topic.'
> - If energyLevel == 4-5: call qrok with 'Today is a high-energy day. Add one extra session for the hardest subject. Optimize for depth, not just coverage.'
> - If blocker mentioned: call qrok with 'The student mentioned: [blocker]. Adjust today's schedule to accommodate this. Show understanding first, then the adjusted plan.'
> 
> **Part 3: Return Adjusted Schedule**
> - Return: { checkInMessage, adjustedSchedule: ScheduleBlock[], energyLevel }
> - Auto-save adjustedSchedule to Firebase
> - Log the check-in: { energyLevel, blockerMentioned: boolean, timestamp, scheduleModifiedCount }"

**File to Create:** `src/lib/dailyCheckIn.ts`

**Additional Details:**
```
- Check-in should run once per calendar day (check Firebase for 'lastCheckInDate')
- If energy is 1-2, also trigger "I Need Help" UI suggestion
- Adjusted schedule is temporary (applies to today only), doesn't overwrite future days
- Energy scoring affects daily max hours: 
  * 1: 1 hour max
  * 2: 2 hours max
  * 3: normal (availableHours.weekday or weekend)
  * 4: +1 hour bonus
  * 5: +2 hours bonus
- Store energyLevel in userDailyLog for analytics
```

---

## **PERSON 2: Frontend UI & Calendar Integration**

### **Role:** React Components, FullCalendar, Dashboard UI, User Flows

---

### **Task 2.1 — Onboarding Chat UI Component**

**Deliverable:** A full-screen chat interface for the AI onboarding conversation (Phase 1).

**Exact Prompt to Code With:**
> "Create `src/components/OnboardingChat.tsx` — a React component that:
> 
> 1. **Layout:**
>    - Full screen, dark background (bg-gray-900)
>    - Top bar: StudyOS logo + 'Setting up your schedule' title + progress indicator (e.g., 'Step 2 of 4')
>    - Main area: chat message list with auto-scroll
>    - Bottom: input area with send button + microphone toggle button
> 
> 2. **Message Display:**
>    - Messages alternate left (Sage) and right (User)
>    - Sage messages: light blue background, slightly rounded, fade-in animation
>    - User messages: green/blue background, rounded, slide-in from right
>    - Timestamp on each message (relative: '1 min ago')
>    - Sage avatar placeholder (simple text 'S' in a circle) on left
> 
> 3. **Input Handling:**
>    - Text input field (placeholder: 'Type your answer...')
>    - Send button (icon: arrow-up in a circle)
>    - Microphone button on left of input (Lucide icon: Mic)
>    - On send: 
>      * Disable input momentarily (loading state)
>      * Show typing indicator in chat: three dots animation
>      * Call runOnboardingChat() from Person 1's onboardingPipeline.ts
>      * Wait for Sage response, append to messages
>      * Re-enable input
> 
> 4. **Voice Input:**
>    - On microphone button click: start Web Speech API transcription
>    - Show visual feedback: 'Listening...' badge, microphone animated
>    - On speech end: transcribe text, insert into input field
>    - User can edit transcribed text before sending
>    - Fallback if browser doesn't support: show tooltip 'Voice not available'
> 
> 5. **Data Extraction Chips:**
>    - As Sage detects subjects, deadlines, etc., show extracted data as chips above input
>    - Format: [Thermodynamics ✅] [Exam: May 10 ✅] etc.
>    - Chips appear with slide-in animation
>    - User can click chip to edit: popup shows current value, user confirms or changes
> 
> 6. **Completion Flow:**
>    - After onboarding_chat returns full history, parseOnboardingChat() is called (Person 1)
>    - Show a loading state: 'Processing your information...'
>    - On success: show confirmation message from Sage: 'Perfect! I've set everything up. Ready to see your personalized schedule?'
>    - Button: 'View Schedule' → navigate to ScheduleView
> 
> 7. **Styling:**
>    - Use Tailwind + custom CSS for animations
>    - Dark mode by default (bg-gray-900, text-white)
>    - Accent color: brand color (use blue-500 or define custom color)
>    - Font: sans-serif, readable size (text-base for messages)
> 
> 8. **TypeScript:**
>    - Type all props and state
>    - Interface ChatMessage { role: 'sage' | 'user', content: string, timestamp: Date }
>    - Interface ExtractedData { subjects: string[], deadlines: string[], motivation: string }
>    - Use React.useState and React.useEffect, no external state management needed
> 
> **Implementation Checklist:**
> - [ ] Messages auto-scroll to bottom on new message
> - [ ] Typing indicator animates
> - [ ] Voice input works on desktop (Chrome, Firefox, Safari)
> - [ ] Graceful fallback if API call fails: show retry button
> - [ ] Extracted data persists to Firebase after onboarding completes
> - [ ] Component exports: `<OnboardingChat />`"

**File to Create:** `src/components/OnboardingChat.tsx`

**Additional Details:**
```
- Message animation: use @keyframes fadeIn { from: opacity 0; to: opacity 1 }, duration 300ms
- Typing indicator: three dots that animate with staggered delay
- Voice input implementation: 
  * Use window.SpeechRecognition or webkit version
  * Language: detect from browser locale, default to 'en-US'
  * Continuous: false (stop after user stops speaking)
- Input field auto-focus after each message
- If message is very long (>500 chars), apply word-wrap and add scroll
- Voice button visual feedback: pulsing animation while listening
```

---

### **Task 2.2 — Schedule View (Main Calendar)**

**Deliverable:** The primary app screen showing FullCalendar with personalized study blocks.

**Exact Prompt to Code With:**
> "Create `src/components/ScheduleView.tsx` — React component that:
> 
> 1. **Top Bar:**
>    - Left: date display (e.g., 'Week of Apr 17 — Apr 23')
>    - Center: today's highlight
>    - Right: streak counter (e.g., '🔥 5-day streak') + next exam countdown (e.g., 'Thermo: 23 days')
>    - Styling: gradient background (blue to purple), white text
> 
> 2. **FullCalendar Integration:**
>    - Install: `npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`
>    - Default view: 'timeGridWeek' (shows hourly slots)
>    - Height: 'auto' or fixed at 70% of viewport
>    - Events (study blocks) render as colored blocks
>    - Each block shows: [Subject Icon] [Topic] [Start—End time]
>    - Colors: pulled from subject.color (stored in userProfile.subjects[])
> 
> 3. **Block Click Handling:**
>    - Clicking a block opens a modal with:
>      * Subject name (bold)
>      * Topic description
>      * Duration (e.g., '60 mins')
>      * Type badge: 'New Content' | 'Revision' | 'Practice' | 'Crunch'
>      * Status pill: 'Pending' (gray) | 'Completed' (green) | 'Missed' (red)
>      * 'Start Session' button (if status == 'pending')
>      * 'Mark Complete' button (if status == 'pending' after 5 mins into block)
>      * Notes field (if any)
>      * Resource link (if any)
>    - On 'Start Session' click: navigate to SessionActiveView
> 
> 4. **Drag & Drop Rescheduling:**
>    - FullCalendar supports dragging blocks to new time slots
>    - On drop: call a validation function (Person 1 provides this)
>    - Show toast: 'Block moved to [new time]. Checking if plan is still on track...'
>    - If conflict: show alert 'Can't move here — conflicts with [Subject]. Choose a different time.'
>    - If valid: update Firebase and call qrok to validate full schedule still meets exams
> 
> 5. **Today's Quick View Strip (Bottom):**
>    - Horizontal scrollable list of today's blocks only
>    - Each as a small card: [Subject] [Time] [30 min duration indicator]
>    - Tap card to jump to that block in calendar
>    - If zero blocks today: message 'You're off today — rest well!'
> 
> 6. **Floating Action Button (FAB):**
>    - Large circle button, bottom-right corner
>    - Icon: Chat bubble (Lucide: MessageCircle)
>    - Tap → navigate to ChatWithSage screen
>    - Badge: if unread Sage messages, show count (e.g., '2')
> 
> 7. **Toolbar:**
>    - Week/Day/Month toggle (default: Week)
>    - Add button: open AddSubjectModal (covered in Task 2.3)
>    - Settings button: navigate to SettingsScreen
> 
> 8. **Loading & Error States:**
>    - On mount: fetch schedule from Firebase
>    - If no schedule: show 'Generate Schedule' CTA (calls generateSchedule from Person 1)
>    - If API error: show 'Schedule unavailable' message with retry button
> 
> 9. **Styling & Animations:**
>    - Use Tailwind for base styling
>    - Custom CSS for FullCalendar theming (dark mode)
>    - Block hover: slight shadow increase + cursor pointer
>    - Toast notifications (use react-toastify or simple custom component): appear for 3 seconds
> 
> 10. **TypeScript:**
>     - Props: none (pulls data from Firebase and React Context or props passed from parent)
>     - State: selectedBlock, viewMode ('week' | 'day' | 'month')
>     - Use FullCalendar's EventClickArg type for click handlers
> 
> **Implementation Checklist:**
> - [ ] FullCalendar renders with correct events from Firebase
> - [ ] Click block → modal appears
> - [ ] Drag & drop works (validated by Person 1's function)
> - [ ] Today's strip updates each day
> - [ ] FAB is always visible and accessible
> - [ ] Dark mode friendly"

**File to Create:** `src/components/ScheduleView.tsx`

**Additional Details:**
```
- FullCalendar CSS: import '@fullcalendar/daygrid/index.global.css' and '@fullcalendar/timegrid/index.global.css'
- Dark mode theme: add custom CSS to override FullCalendar's default light theme
- Block colors: use subject.color directly (assumes hex values stored in userProfile)
- Drag validation function from Person 1: `validateScheduleAfterDragDrop(schedule) → { valid: boolean, message: string }`
- Modal for block details: can be separate component or inline Modal component
- Toast component: simple div with fixed position, auto-dismiss after 3s
- Streak counter: fetch from Firebase key 'currentStreak'
- Next exam countdown: find nearest deadline from userProfile.subjects[] and calculate days
```

---

### **Task 2.3 — Session Active View (Study Timer)**

**Deliverable:** Full-screen view when a user starts a study session, includes Pomodoro timer and proof prompt.

**Exact Prompt to Code With:**
> "Create `src/components/SessionActiveView.tsx` — React component that:
> 
> 1. **Header:**
>    - Back button (X icon, top-left)
>    - Subject name + topic (e.g., 'Thermodynamics — Laws of Thermodynamics')
>    - Timestamp (e.g., 'Started 2 mins ago')
> 
> 2. **Central Pomodoro Timer:**
>    - Large circular progress ring (SVG or CSS)
>    - Displays remaining time: MM:SS (e.g., '24:32')
>    - Default: 25 mins study, 5 mins break
>    - Below timer: toggles to customize interval (25/5, 45/10, 50/10, custom)
>    - Start/Pause/Reset buttons below timer
>    - Visual feedback: ring color changes as time decreases (green → yellow → red)
> 
> 3. **Session Info Panel (Below Timer):**
>    - Duration of this block (e.g., 'Total: 60 mins')
>    - Pomodoros completed so far (e.g., '1/2 pomodoros done')
>    - Notes for this session (if any)
>    - Resource link (clickable, opens in new tab)
> 
> 4. **Quick Actions:**
>    - 'Pause Session' button: can pause to take a break without ending
>    - 'End Session Early' button: stops the timer and goes to proof prompt
>    - 'I Need Help' button: overlay modal with Sage emergency support (Person 5 owns this)
> 
> 5. **Proof Prompt (End of Session):**
>    - When timer hits zero OR user taps 'End Session':
>    - Modal appears: 'How do you want to verify this session?'
>    - Options (from Person 1's proofVerifier.ts):
>      a) 'Take a Photo' → camera input, send to verifyPhotoProof()
>      b) 'Take a Quick Quiz' → call generateQuickQuiz(), display 3 questions, collect answers
>      c) 'Voice Note' → record 30-sec voice, transcribe, Sage evaluates
>      d) 'Skip Proof' → session marked as unverified
>    - After proof selected:
>      * Show loading: 'Verifying...'
>      * Display result: 'Verified ✅' | 'Unverified ⚠️' with confidence score
>      * Brief feedback from qrok (from verifyPhotoProof or gradeQuizAnswers)
>      * Button: 'Next Session' (if more blocks today) OR 'Go to Dashboard'
> 
> 6. **Styling & Animations:**
>    - Full-screen dark background (motivational vibe)
>    - Timer ring: use CSS @keyframes or SVG animation
>    - Pulse effect on timer as time runs out
>    - Proof modal: slide up from bottom with fade-in
>    - Progress indicators: smooth transitions
> 
> 7. **State Management:**
>    - useState: timeRemaining, isRunning, pomodorosDone, currentBlockId
>    - useEffect: interval to decrement timeRemaining every second
>    - Firebase: save session progress in case user navigates away
> 
> 8. **TypeScript:**
>    - Interface PomodoroConfig { studyMins: number, breakMins: number }
>    - Track activeBlock from props
>    - Handle timer pause/resume logic cleanly
> 
> **Implementation Checklist:**
> - [ ] Timer counts down accurately (tested: start timer, verify every second decrements)
> - [ ] Timer completion triggers proof prompt
> - [ ] Proof modal shows correct options
> - [ ] Photo upload works (file input with preview)
> - [ ] Voice recording works (MediaRecorder API)
> - [ ] Quiz displays and collects answers
> - [ ] Verification result shows with feedback
> - [ ] Session data logged to completionLog in Firebase"

**File to Create:** `src/components/SessionActiveView.tsx`

**Additional Details:**
```
- Timer implementation: use setInterval with state updates
- SVG circular progress ring: 
  * strokeDasharray set to circumference (2πr)
  * strokeDashoffset animated based on (timeRemaining / totalTime)
- Pomodoro config saved to Firebase: 'pomodoroConfig'
- Camera input: use <input type="file" accept="image/*" /> or camera input
- Voice recording: use MediaRecorder API (navigator.mediaDevices.getUserUserMedia)
- Quiz component can be separate or inline
- Session data structure: { blockId, startTime, endTime, proofType, verified, score, timestamp }
- Store in Firebase under 'completionLog'
```

---

### **Task 2.4 — Dashboard & Analytics Screen**

**Deliverable:** Multi-panel dashboard showing study progress, streaks, mastery scores, and deadline countdowns.

**Exact Prompt to Code With:**
> "Create `src/components/Dashboard.tsx` — React component with 5 dashboard sections:
> 
> 1. **Heat Map Calendar (Top):**
>    - GitHub-style contribution graph showing last 12 weeks
>    - Each square = 1 day
>    - Color intensity: gray (0h) → light green (1-2h) → medium green (3-4h) → dark green (5h+)
>    - Hover over square: tooltip shows date + hours studied + sessions
>    - Month labels above each month
>    - Implementation: build custom component or use react-heat-map library
> 
> 2. **Weekly Summary Section:**
>    - Card showing: 'This Week'
>    - Stats:
>      * Total hours studied (actual vs planned)
>      * Sessions completed / total planned
>      * Completion rate %
>      * Best day (highest hours)
>      * One Sage-generated recommendation for next week
>    - 'View Full Report' button → full-page weekly summary (Sage-generated by Person 1)
>    - Bar chart: 7 bars (Mon-Sun) showing hours per day (use Recharts)
> 
> 3. **Subject Mastery Scores:**
>    - For each subject: circular progress ring showing mastery %
>    - Formula: (revisionCompletion × 0.4) + (quizAvg × 0.4) + (streakBonus × 0.2)
>    - Color coded: 0-33% red, 34-66% yellow, 67-100% green
>    - Text below ring: subject name + % number + last studied date
>    - Layout: 2-3 columns (responsive)
>    - Tap ring → subject detail page showing topics, quiz scores, revision status
> 
> 4. **Exam Countdown Cards:**
>    - For each subject with a deadline, show a card:
>      * Subject name (bold)
>      * Days remaining (large number)
>      * Estimated readiness % (from mastery + exam proximity)
>      * Color coded: green (>7 days), yellow (3-7), red (<3)
>      * Mini progress bar showing readiness
>    - Sort by days remaining (nearest first)
>    - Layout: vertical stack or grid
>    - Tap card → focus view for that subject (shows only blocks for that subject in calendar)
> 
> 5. **Streak & Momentum Card:**
>    - Large prominent card at top
>    - 🔥 Current streak: X days (bold, large)
>    - Sub-text: 'Keep it going!'
>    - Breakdown: 'Longest streak: Y days'
>    - Consistency score: X% (days with ≥1 session / total days)
>    - Visual: flame icon that grows with streak length
>    - History: mini bar chart showing weekly consistency last 4 weeks
> 
> 6. **Overall Layout:**
>    - Top: Streak card (full width)
>    - Second: Heat map (full width, scrollable horizontally)
>    - Third: Weekly summary card (full width)
>    - Fourth: Subject mastery rings (responsive grid)
>    - Fifth: Exam countdowns (vertical stack)
>    - Bottom: 'Generate Weekly Report' button → calls Sage to generate full text report
> 
> 7. **Styling:**
>    - Dark theme by default
>    - Cards have subtle shadows and rounded corners
>    - Consistent color scheme: green (good), yellow (warning), red (urgent)
>    - Responsive: works on mobile (single column) and desktop (multi-column)
> 
> 8. **Data Flow:**
>    - Pull completionLog from Firebase
>    - Calculate all metrics:
>      * Hours = sum of (endTime - startTime) for all completed blocks
>      * Sessions = count of blocks with status 'completed'
>      * Streaks = count consecutive days with ≥1 completed block
>      * Mastery = weighted average of quizScores + revisionCompletion + streakBonus
>      * Readiness = (currentLevel / 10 * 50%) + (revisionCompletion * 30%) + (daysUntilExam adjustment * 20%)
>    - On mount: fetch data, calculate metrics, render
> 
> 9. **Interactive Features:**
>    - Click subject mastery ring → detail page for that subject
>    - Click exam countdown card → focus calendar for that subject
>    - 'View Full Report' → open WeeklyReportModal (separate component)
>    - Swipe heat map horizontally to see previous months
> 
> 10. **TypeScript:**
>     - Interface MetricsData { totalHours, sessionsCompleted, currentStreak, masteryBySubject, readinessBySubject }
>     - Pull types from completionLog and scheduleBlocks
> 
> **Implementation Checklist:**
> - [ ] Heat map renders all days correctly
> - [ ] Weekly stats are calculated accurately
> - [ ] Mastery rings display correct percentages
> - [ ] Exam cards sort by deadline
> - [ ] Streak counter updates daily
> - [ ] Charts render properly (Recharts)
> - [ ] All colors follow accessibility guidelines (contrast ratio ≥ 4.5:1)"

**File to Create:** `src/components/Dashboard.tsx`

**Additional Details:**
```
- Heat map calculation: 
  * Pull all blocks with status 'completed' from completionLog
  * Group by date
  * Sum duration per date
  * Map to colors based on thresholds
- Mastery calculation requires: quizScores from completionLog, revisionCompletion % (count of revision blocks completed / total scheduled), streakBonus (10 points per 5-day streak)
- Readiness calculation:
  * currentLevel: user's self-assessment (1-10)
  * revisionCompletion: % of scheduled revisions done
  * daysUntilExam: adjust readiness down as exam approaches
  * Formula ensures readiness is ~100% by exam day if student stays on track
- Weekly report generated by Person 1's qrok call (implement as separate utility function)
- Charts using Recharts: BarChart for weekly hours, CircleChart or PieChart for subject mastery
```

---

### **Task 2.5 — Chat with Sage Screen**

**Deliverable:** A persistent, accessible chat interface for user-Sage conversations.

**Exact Prompt to Code With:**
> "Create `src/components/ChatWithSage.tsx` — React component that:
> 
> 1. **Layout:**
>    - Full screen or modal overlay (40% width on desktop, full on mobile)
>    - Header: 'Chat with Sage' title + close button
>    - Message area: scrollable chat history
>    - Input area: text field + send button
>    - Bottom: suggested prompt chips (optional)
> 
> 2. **Chat Flow:**
>    - Sage greeting: 'Hi [name]! What's on your mind?' appears on first open
>    - User types → send message → call qrok API with:
>      * system: generateSagePrompt(userProfile, 'companion_chat')
>      * user: user's message
>    - Sage responds within 2-5 seconds
>    - Both messages added to chat history
>    - Chat history persists in Firebase key 'chat_history'
>    - On close and reopen: show last 10 messages of history
> 
> 3. **Message Types & Responses:**
>    - **Schedule requests:** 'Move today to 9pm' / 'Can I skip tomorrow?'
>      → qrok calls helper functions from Person 1 to modify schedule
>      → Returns confirmation + updated view
>    - **Subject questions:** 'Explain the Carnot cycle'
>      → qrok provides concise explanation (2-3 sentences max, not a lecture)
>    - **Emotional support:** 'I don't think I can finish'
>      → qrok validates emotion, offers practical step
>    - **Data-driven insights:** 'Am I on track?'
>      → qrok checks completionLog + schedule, provides honest assessment with next actions
> 
> 4. **Suggested Prompts:**
>    - Chips below input showing quick-start prompts:
>      * 'Adjust today's schedule'
>      * 'How am I doing?'
>      * 'Explain [most difficult subject]'
>      * 'I need encouragement'
>    - User can tap chip to auto-fill input, or type freely
>    - Chips change based on context (day of week, how many sessions completed, time of day)
> 
> 5. **Emergency Mode:**
>    - If user mentions: 'help', 'can't', 'overwhelmed', 'panic', 'anxious'
>    → Sage immediately shifts to calm, empathetic tone (controlled by qrok system prompt variation)
>    → Focus on ONE simple next action, no schedule/data shown
>    → After conversation, offer: 'Want to look at your plan together?'
> 
> 6. **Interactive Features:**
>    - Long-press user message → copy / delete options
>    - Sage message contains 'schedule' or 'update' word → highlight relevant block in schedule if user navigates back
>    - Voice input option: microphone button in input (same as onboarding chat)
> 
> 7. **Styling:**
>    - Match OnboardingChat visual style (bubbles, timestamps)
>    - Dark mode
>    - Smooth message animations (fade-in)
>    - Loading indicator while waiting for Sage response
> 
> 8. **TypeScript:**
>    - State: messages[], inputText, isLoading
>    - Handle message sending with debounce (max 1 message per 500ms)
>    - Validate input (max 1000 chars)
> 
> 9. **Edge Cases:**
>    - API timeout (>5s): show 'Sage is thinking...' spinner, retry on timeout
>    - Malformed response: show error, offer retry
>    - User closes app mid-conversation: restore chat on reopen
> 
> **Implementation Checklist:**
> - [ ] Chat history persists to Firebase
> - [ ] Messages send and receive correctly
> - [ ] Loading state shows while waiting
> - [ ] Suggested prompts work
> - [ ] Emergency tone triggers on keywords
> - [ ] Voice input works (same as onboarding)
> - [ ] Mobile responsive"

**File to Create:** `src/components/ChatWithSage.tsx`

**Additional Details:**
```
- Chat history storage: Firebase key 'chat_history' as JSON array
- Each message: { id, role: 'user' | 'sage', content, timestamp }
- Suggested prompts: can be hardcoded or dynamic based on:
  * Time of day (morning → encouraging, evening → rest-focused)
  * Exam proximity (< 3 days → crunch-focused)
  * Completion rate (low → encouragement, high → challenge)
- Emergency keywords list: ['help', 'can't', 'fail', 'anxious', 'panic', 'give up', 'impossible', 'overwhelm']
- Emergency system prompt variation: less data-focused, more emotional validation
- Response timeout: 5 seconds, show loading spinner
- Input debounce: prevents rapid-fire messages, max 1 per 500ms
```

---

## **PERSON 3: Data Management & Architecture**

### **Role:** Firebase Architecture, State Management, Data Persistence

---

### **Task 3.1 — Data Persistence Layer (Firebase Schema)**

**Deliverable:** A well-structured Firebase schema and utility functions for reading/writing all app data.

**Exact Prompt to Code With:**
> "Create `src/lib/dataStore.ts` — a TypeScript module that manages all Firebase operations:
> 
> 1. **Data Schema Definition:**
>    Define TypeScript interfaces for all data stored:
>    ```typescript
>    interface AppDataStore {
>      userProfile: UserProfile | null,
>      scheduleBlocks: ScheduleBlock[],
>      completionLog: CompletionLogEntry[],
>      chatHistory: ChatMessage[],
>      userDailyLog: DailyLogEntry[],
>      onboardingComplete: boolean,
>      metadata: {
>        lastSync: ISO timestamp,
>        appVersion: string,
>        deviceId: string
>      }
>    }
>    ```
> 
> 2. **Initialize Store Function:**
>    Export `initializeDataStore() → void`:
>    - Called on app startup (main App.tsx)
>    - Checks if data exists in Firebase
>    - If not, creates empty schema with defaults
>    - If yes, validates schema (checks for missing fields)
>    - Logs store status to console (dev mode)
> 
> 3. **Read Functions (Getters):**
>    Export these async functions (wrap in Promise for future backend migration):
>    - `getUserProfile() → Promise<UserProfile | null>`
>    - `getScheduleBlocks(filterByStatus?: 'pending' | 'completed' | 'missed') → Promise<ScheduleBlock[]>`
>    - `getCompletionLog(days?: number) → Promise<CompletionLogEntry[]>` (optional param: get last N days)
>    - `getChatHistory() → Promise<ChatMessage[]>`
>    - `getUserDailyLog(date?: YYYY-MM-DD) → Promise<DailyLogEntry[]>`
>    - `isOnboardingComplete() → Promise<boolean>`
>    - `getMetadata() → Promise<metadata>`
> 
> 4. **Write Functions (Setters):**
>    Export these async functions:
>    - `setUserProfile(profile: UserProfile) → Promise<void>`
>    - `updateScheduleBlocks(blocks: ScheduleBlock[]) → Promise<void>` (replaces entire array)
>    - `updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>) → Promise<void>` (merge update)
>    - `addCompletionLogEntry(entry: CompletionLogEntry) → Promise<void>` (append)
>    - `addChatMessage(message: ChatMessage) → Promise<void>` (append)
>    - `setOnboardingComplete(complete: boolean) → Promise<void>`
>    - `addDailyLogEntry(entry: DailyLogEntry) → Promise<void>` (append)
> 
> 5. **Helper Functions:**
>    Export these utility functions:
>    - `clearAllData() → Promise<void>` (factory reset, only use in settings)
>    - `validateDataIntegrity() → { valid: boolean, errors: string[] }` (check for missing fields, invalid dates, etc.)
>    - `exportDataAsJSON() → string` (returns entire store as JSON string)
>    - `importDataFromJSON(jsonString: string) → Promise<void>` (overwrites store with imported data, validates first)
>    - `calculateStorageUsed() → number` (returns approx size in bytes used by Firebase)
> 
> 6. **Error Handling:**
>    - Wrap all Firebase reads/writes in try-catch
>    - On write quota exceeded: throw error 'Firebase quota exceeded. Please clear some data.'
>    - On parsing error: throw error 'Data corruption detected in [key]. Run validateDataIntegrity().'
>    - Log errors to console with context
> 
> 7. **Validation:**
>    - `validateUserProfile(profile): boolean` — checks all required fields
>    - `validateScheduleBlock(block): boolean` — checks startTime < endTime, valid date, valid type
>    - `validateCompletionLogEntry(entry): boolean` — checks blockId exists, timestamp is valid
>    - All validators return boolean; validation on write, throw on invalid
> 
> 8. **Firebase Keys:**
>    Define constants for all keys to avoid magic strings:
>    ```typescript
>    const STORAGE_KEYS = {
>      USER_PROFILE: 'studyos_user_profile',
>      SCHEDULE_BLOCKS: 'studyos_schedule_blocks',
>      COMPLETION_LOG: 'studyos_completion_log',
>      CHAT_HISTORY: 'studyos_chat_history',
>      DAILY_LOG: 'studyos_daily_log',
>      ONBOARDING_COMPLETE: 'studyos_onboarding_complete',
>      METADATA: 'studyos_metadata',
>    }
>    ```
> 
> 9. **Debug Mode:**
>    - Export `debugDataStore() → void` — logs entire store to console (pretty-printed JSON)
>    - Only active if Firebase key 'studyos_debug' = 'true'
> 
> **Implementation Checklist:**
> - [ ] All STORAGE_KEYS constants defined
> - [ ] Read functions return correct data from Firebase
> - [ ] Write functions persist data correctly
> - [ ] Validation prevents invalid data from being stored
> - [ ] Error messages are clear and actionable
> - [ ] Storage quota errors handled gracefully
> - [ ] Export/import functions work (tested with JSON file)
> - [ ] TypeScript types are strict (no 'any' type)"

**File to Create:** `src/lib/dataStore.ts`

**Additional Details:**
```
- All functions should be async (return Promise) even though Firebase is synchronous
- This future-proofs for Firebase Firestore or other backend later
- Validation on write: throw error if invalid, don't silently fail
- Daily log: stores one entry per day with: date, energyLevel, blockersText, completedCount, totalHours
- Metadata: track appVersion to detect when user upgrades
- Storage quota warning: if calculateStorageUsed() > 5MB, prompt user to export/clear old data
- Debug mode accessible via: window.Firebase.setItem('studyos_debug', 'true') in browser console
- Each read function should check if data exists before returning (return null if not found, not empty array)
```

---

### **Task 3.2 — React Context for Global State**

**Deliverable:** A custom React Context that provides app-wide state and avoids prop drilling.

**Exact Prompt to Code With:**
> "Create `src/context/AppContext.tsx` — React Context for global state:
> 
> 1. **Context Definition:**
>    ```typescript
>    interface AppContextType {
>      // State
>      userProfile: UserProfile | null,
>      scheduleBlocks: ScheduleBlock[],
>      completionLog: CompletionLogEntry[],
>      isLoading: boolean,
>      isOnboardingComplete: boolean,
>      
>      // Actions
>      setUserProfile: (profile: UserProfile) => Promise<void>,
>      updateScheduleBlock: (blockId: string, updates: Partial<ScheduleBlock>) => Promise<void>,
>      regenerateSchedule: () => Promise<void>, // calls Person 1's generateSchedule()
>      markSessionComplete: (blockId: string, proofType: 'photo' | 'quiz' | 'voice' | 'none', score?: number) => Promise<void>,
>      markSessionMissed: (blockId: string) => Promise<void>,
>      calculateMetrics: () => MetricsData, // streaks, hours, mastery scores
>      refreshAllData: () => Promise<void>,
>    }
>    ```
> 
> 2. **Provider Component:**
>    Export `<AppProvider children>` component:
>    - Initializes dataStore on mount
>    - Loads userProfile, scheduleBlocks, completionLog from Firebase
>    - Provides context to all children
>    - On refresh (F5): restores state from Firebase automatically
> 
> 3. **Custom Hook:**
>    Export `useAppContext() → AppContextType`:
>    - Allows any component to consume context with: `const { userProfile, updateScheduleBlock } = useAppContext()`
>    - Throws error if used outside Provider
> 
> 4. **Action Implementations:**
>    - `setUserProfile()`: calls dataStore.setUserProfile(), updates context state
>    - `updateScheduleBlock()`: calls dataStore.updateScheduleBlock(), updates context state
>    - `regenerateSchedule()`: calls Person 1's generateSchedule(userProfile), saves to Firebase, updates context
>    - `markSessionComplete()`: updates block status to 'completed', adds completionLogEntry, calls dataStore functions
>    - `markSessionMissed()`: updates block status to 'missed', triggers cascadeRescheduler (Person 1), updates schedule
>    - `calculateMetrics()`: pulls from completionLog, calculates streaks, hours, mastery scores, returns MetricsData
>    - `refreshAllData()`: re-fetches all data from Firebase, useful after importing data
> 
> 5. **Error Handling:**
>    - All actions wrapped in try-catch
>    - On error: set isLoading to false, throw error up to component
>    - Component can show error toast
> 
> 6. **Optimization:**
>    - Use useCallback to memoize action functions
>    - Use useMemo to memoize calculateMetrics() result (recalculate only when completionLog changes)
>    - Use useReducer if more complex state transitions needed (optional for MVP)
> 
> 7. **Initialization:**
>    - On mount: isLoading = true
>    - Load from Firebase: 100-500ms
>    - Set isLoading = false
>    - Components can show spinner while isLoading = true
> 
> **Implementation Checklist:**
> - [ ] Context types are strict (no 'any')
> - [ ] Provider loads data on mount
> - [ ] useAppContext hook works in all components
> - [ ] All actions are async and return Promise
> - [ ] Error handling prevents silent failures
> - [ ] Memoization improves performance
> - [ ] Refresh works (tested with F5 and Firebase manual change)"

**File to Create:** `src/context/AppContext.tsx`

**Additional Details:**
```
- Use React.createContext with null as default, throw error if hook used outside Provider
- Initialize with: const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
- Actions should batch updates: update context state + save to dataStore together
- calculateMetrics() should be called after every completionLogEntry addition
- refreshAllData() useful for: after import, manual data reset, or debugging
- Consider useReducer if action dependencies become complex (>5 interdependent updates)
```

---

### **Task 3.3 — Data Export & Import Utilities**

**Deliverable:** Functions to export schedule as PDF/iCal and import from JSON.

**Exact Prompt to Code With:**
> "Create `src/lib/exportImport.ts` — utility functions for data portability:
> 
> 1. **Export to PDF:**
>    Export async `exportScheduleAsPDF(scheduleBlocks: ScheduleBlock[], userProfile: UserProfile, fileName?: string) → Promise<void>`:
>    - Install: `npm install jspdf html2canvas`
>    - Generate a nicely formatted PDF showing:
>      * Header: StudyOS logo + user name
>      * Weekly calendar view (7 columns for days, 24 rows for hours)
>      * Each block colored by subject.color
>      * Legend: subject names + colors
>      * Summary stats: total hours, number of sessions, deadline countdown
>    - Use html2canvas to render HTML → image → PDF
>    - Save file with default name: `StudyOS_Schedule_[Date].pdf`
>    - Trigger download automatically
> 
> 2. **Export to iCal (.ics):**
>    Export `exportScheduleAsiCal(scheduleBlocks: ScheduleBlock[], userProfile: UserProfile) → Promise<void>`:
>    - Install: `npm install ical-generator`
>    - Create iCal calendar with:
>      * Each ScheduleBlock as an event
>      * Event title: [Subject] — [Topic]
>      * Event time: startTime to endTime on date
>      * Event color: map to subject.color
>      * Event description: type + notes
>    - Generate .ics file, trigger download
>    - Default filename: `StudyOS_[userName]_[Date].ics`
>    - User can import this into Google Calendar, Apple Calendar, Outlook
> 
> 3. **Export as JSON:**
>    Export `exportDataAsJSON(allData: AppDataStore, fileName?: string) → void`:
>    - Use dataStore.exportDataAsJSON() (from Task 3.1)
>    - Trigger JSON file download
>    - Include metadata: export date, app version
>    - Filename: `StudyOS_Backup_[Date].json`
> 
> 4. **Import from JSON:**
>    Export async `importDataFromJSON(file: File) → Promise<{ success: boolean, message: string, entriesImported: number }>`:
>    - Accept File object from <input type=\"file\" accept=\".json\">
>    - Read file as text
>    - Parse JSON
>    - Validate data structure (call dataStore.validateDataIntegrity())
>    - If valid: merge with existing data (ask user: overwrite or merge?)
>      * For MVP: overwrite entire store
>      * Show confirmation: 'Importing will replace all current data. Continue?'
>    - If invalid: throw error with details of what's wrong
>    - Return success status + message + count of entries imported
> 
> 5. **Export Weekly Report (Text):**
>    Export `exportWeeklyReportAsText(metrics: MetricsData, userProfile: UserProfile) → string`:
>    - Returns markdown-formatted weekly summary
>    - Content: (generated by Person 1's Sage, this function just formats)
>      * Week date range
>      * Hours studied (actual vs planned)
>      * Sessions completed
>      * Streak maintained
>      * Subjects with best/worst completion
>      * One actionable recommendation
>    - Can be displayed in modal or copied to clipboard
> 
> 6. **Clipboard Utilities:**
>    Export `copyToClipboard(text: string) → Promise<void>`:
>    - Use navigator.clipboard.writeText()
>    - Handle fallback for older browsers (select + copy)
> 
> 7. **Error Handling:**
>    - File size limit: warn if > 10MB
>    - Encoding issues: handle non-UTF8 gracefully
>    - Missing required fields: show specific error (e.g., 'Missing subjects in imported data')
> 
> **Implementation Checklist:**
> - [ ] PDF export renders correctly and is readable
> - [ ] iCal export imports into Google Calendar successfully
> - [ ] JSON export/import preserves all data exactly
> - [ ] File downloads work on all browsers
> - [ ] Error messages are clear
> - [ ] File size warnings shown for large exports
> - [ ] Clipboard copy works"

**File to Create:** `src/lib/exportImport.ts`

**Additional Details:**
```
- PDF layout: use jsPDF with html2canvas for simplicity
  * Header: 20px, logo + title
  * Calendar grid: 7 columns (days), 24 rows (hours)
  * Each cell: 40px width, 20px height
  * Colors: use subject.color directly
- iCal export: each event should have:
  * DTSTART: full ISO datetime
  * DTEND: full ISO datetime
  * SUMMARY: [Subject] — [Topic]
  * DESCRIPTION: block type + notes
  * COLOR property (may not be standard, but many calendar apps support it)
- JSON import: provide option to merge vs overwrite
  * Merge: keep existing blocks, add new entries from import
  * Overwrite: replace entire store (safer, less confusing)
- Weekly report: markdown format for future sharing/printing
  * Include: dates, stats, per-subject breakdown, recommendation
```

---

### **Task 3.4 — Time & Calendar Utilities**

**Deliverable:** Helper functions for date/time calculations.

**Exact Prompt to Code With:**
> "Create `src/lib/timeUtils.ts` — utility functions for date/time operations:
> 
> 1. **Date Calculations:**
>    - `daysTillDeadline(deadline: YYYY-MM-DD) → number` — returns days remaining (can be negative if past)
>    - `daysAgo(date: ISO timestamp) → number` — returns how many days ago
>    - `isSameDay(date1: Date, date2: Date) → boolean` — compare dates ignoring time
>    - `getWeekStart(date?: Date) → Date` — Monday of the week containing date (or today)
>    - `getWeekEnd(date?: Date) → Date` — Sunday of the week containing date
>    - `addDays(date: Date, days: number) → Date` — date arithmetic
>    - `addMinutes(date: Date, mins: number) → Date` — time arithmetic
> 
> 2. **Formatting Functions:**
>    - `formatDateShort(date: Date) → string` — 'Apr 17' or 'Apr 17, 2026'
>    - `formatDateFull(date: Date) → string` — 'Thursday, April 17, 2026'
>    - `formatTime(date: Date) → string` — '09:30' (24-hour)
>    - `formatTimeRange(start: Date, end: Date) → string` — '09:30 - 11:00'
>    - `formatDurationMinutes(mins: number) → string` — '1 h 30 m' or '45 min'
>    - `formatRelativeTime(date: Date) → string` — 'in 2 days' or '3 days ago'
> 
> 3. **Schedule Block Validation:**
>    - `isBlockInPast(block: ScheduleBlock) → boolean` — if date is today and end time has passed
>    - `isBlockToday(block: ScheduleBlock) → boolean` — if date equals today
>    - `isBlockFuture(block: ScheduleBlock) → boolean` — if block is after now
>    - `getNextPendingBlock(blocks: ScheduleBlock[]) → ScheduleBlock | null` — find first pending block from now onward
>    - `getBlocksForDate(blocks: ScheduleBlock[], date: YYYY-MM-DD) → ScheduleBlock[]` — filter blocks by date
>    - `getBlocksForToday(blocks: ScheduleBlock[]) → ScheduleBlock[]` — filter today's blocks
>    - `getBlocksForWeek(blocks: ScheduleBlock[], startDate?: Date) → ScheduleBlock[]` — filter this week
> 
> 4. **Time Conflict Detection:**
>    - `hasTimeConflict(block1: ScheduleBlock, block2: ScheduleBlock) → boolean` — check if two blocks overlap in time on same day
>    - `findConflicts(blocks: ScheduleBlock[]) → { blockId1, blockId2 }[]` — find all overlapping pairs
>    - `findAvailableSlot(blocks: ScheduleBlock[], date: YYYY-MM-DD, duration: mins, constraints: { wakeAt, sleepBy }) → { startTime, endTime } | null` — find first available slot of given duration
> 
> 5. **Streak Calculation:**
>    - `calculateCurrentStreak(completionLog: CompletionLogEntry[], today?: Date) → number` — count consecutive days with ≥1 completed block
>    - `calculateLongestStreak(completionLog: CompletionLogEntry[]) → number` — historical longest
>    - `calculateConsistency(completionLog: CompletionLogEntry[], days: number) → number` — % of days with study in last N days
> 
> 6. **Hours Calculation:**
>    - `calculateHoursByDate(blocks: ScheduleBlock[], date?: YYYY-MM-DD) → number` — sum of block durations for a date (or today)
>    - `calculateHoursByDateRange(blocks: ScheduleBlock[], startDate, endDate) → number` — sum over range
>    - `calculateHoursBySubject(blocks: ScheduleBlock[], subjectId: string) → number` — sum for one subject
>    - `calculateTotalHours(blocks: ScheduleBlock[]) → number` — sum all blocks
> 
> 7. **Working Hours:**
>    - `isWithinWorkingHours(time: HH:MM, constraints: { wakeAt, sleepBy }) → boolean` — check if time is allowed
>    - `getWorkingHoursRange(constraints) → { start: Date, end: Date }` — returns today's working window
> 
> 8. **Timezone Handling (Optional for MVP):**
>    - `getCurrentTimezone() → string` — detect user's timezone
>    - `formatInTimezone(date: Date, tz: string) → string` — format date in specified timezone
> 
> **Implementation Checklist:**
> - [ ] All date functions return correct results (test with known dates)
> - [ ] Time conflict detection works
> - [ ] Streak calculation is accurate
> - [ ] Hours calculation sums correctly
> - [ ] Formatting functions produce readable output
> - [ ] All functions have JSDoc comments
> - [ ] No hardcoded timezones (use local)"

**File to Create:** `src/lib/timeUtils.ts`

**Additional Details:**
```
- Use native Date object (no external library for MVP)
- All functions should be pure (no side effects)
- Dates returned as Date objects, strings as YYYY-MM-DD format for consistency
- Time format: 24-hour HH:MM (09:30, not 9:30 AM)
- Relative time examples: 'in 2 days', '3 days ago', 'today', 'tomorrow', 'yesterday'
- Streak logic: a day counts if it has ≥1 block with status 'completed' and proofVerified = true
  * If proof not verified, don't count toward streak (prevents false positives)
- Consistency: (daysWithStudy / totalDays) * 100
- All date comparisons should ignore time (use midnight for calculations)
```

---

## **PERSON 4: UI Components & Polish**

### **Role:** Reusable Components, Settings, Mobile Responsive, Accessibility

---

### **Task 4.1 — Reusable UI Component Library**

**Deliverable:** A collection of small, composable UI components used throughout the app.

**Exact Prompt to Code With:**
> "Create `src/components/ui/` folder with these reusable components:
> 
> 1. **Button Component (`Button.tsx`)**
>    Props: { children, onClick, variant: 'primary' | 'secondary' | 'danger' | 'ghost', size: 'sm' | 'md' | 'lg', disabled, loading }
>    - Variants:
>      * primary: filled blue button
>      * secondary: outlined button
>      * danger: red button for delete/reset actions
>      * ghost: transparent, text-only
>    - Sizes: adjust padding and font size
>    - Loading state: shows spinner inside button
>    - Disabled: grayed out, no click
>    - Example usage: `<Button variant=\"primary\" size=\"lg\" onClick={handleSubmit}>Submit</Button>`
> 
> 2. **Modal Component (`Modal.tsx`)**
>    Props: { isOpen, onClose, title, children, footer, size: 'sm' | 'md' | 'lg' }
>    - Overlay: dark background, closes on overlay click
>    - Header: title + close button (X icon)
>    - Content area: children render here
>    - Footer: optional buttons area (e.g., Cancel / Confirm)
>    - Size: controls modal width
>    - Animations: fade-in overlay, slide-up content
> 
> 3. **Card Component (`Card.tsx`)**
>    Props: { children, title, subtitle, footer, onClick }
>    - Container: rounded corners, subtle shadow
>    - Header section (optional): title + subtitle
>    - Content area: children
>    - Footer section (optional): action buttons
>    - Hover effect: slight shadow increase
>    - Example: `<Card title=\"Thermodynamics\" subtitle=\"3 days till exam\"><ProgressRing value={75} /></Card>`
> 
> 4. **ProgressRing Component (`ProgressRing.tsx`)**
>    Props: { value: 0-100, size: 'sm' | 'md' | 'lg', color: 'green' | 'yellow' | 'red', showLabel: boolean }
>    - SVG-based circular progress indicator
>    - Value: percentage (0-100)
>    - Color: changes based on value (low=red, mid=yellow, high=green)
>    - Label: optional % text in center (e.g., '75%')
>    - Example: `<ProgressRing value={82} size=\"lg\" showLabel />`
> 
> 5. **Badge Component (`Badge.tsx`)**
>    Props: { children, variant: 'info' | 'success' | 'warning' | 'danger', size: 'sm' | 'md' }
>    - Small label component
>    - Variants: colors for different states
>    - Example: `<Badge variant=\"success\">Verified ✅</Badge>`
> 
> 6. **Toast Component (`Toast.tsx`)**
>    Props: { message, type: 'success' | 'error' | 'info', duration: number (ms) }
>    - Notification that appears bottom-right
>    - Auto-dismisses after duration (default 3000ms)
>    - Type determines color: green=success, red=error, blue=info
>    - Can have close button
>    - Example: `<Toast message=\"Schedule updated!\" type=\"success\" />`
> 
> 7. **Spinner Component (`Spinner.tsx`)**
>    Props: { size: 'sm' | 'md' | 'lg', color: 'primary' | 'secondary' }
>    - Animated loading spinner (CSS or SVG)
>    - Used in buttons, modals, full-screen loading
>    - Example: `<Spinner size=\"lg\" /> Loading schedule...`
> 
> 8. **Input Component (`Input.tsx`)**
>    Props: { type: 'text' | 'number' | 'email' | 'password' | 'date' | 'time', label, placeholder, value, onChange, error, required, disabled }
>    - Labeled input field
>    - Shows error message below if error prop provided
>    - Required indicator (*)
>    - Dark mode styling
>    - Example: `<Input type=\"email\" label=\"Email\" placeholder=\"you@example.com\" onChange={setEmail} />`
> 
> 9. **Checkbox Component (`Checkbox.tsx`)**
>    Props: { label, checked, onChange, disabled }
>    - Custom checkbox styling (dark mode friendly)
>    - Label clickable
>    - Example: `<Checkbox label=\"I agree to terms\" checked={agree} onChange={setAgree} />`
> 
> 10. **Segment Control (`SegmentControl.tsx`)**
>     Props: { options: { label, value }[], selectedValue, onChange }
>     - Horizontal tabs/buttons for selecting between options
>     - One always selected
>     - Example: `<SegmentControl options={[{label:'Week',value:'week'},{label:'Month',value:'month'}]} selectedValue={view} onChange={setView} />`
> 
> **Implementation Requirements:**
> - All components use Tailwind CSS + custom CSS for dark mode
> - All components export TypeScript interfaces for props
> - All components are small and composable (don't do too much)
> - All animations are smooth and < 300ms
> - Hover/focus states for accessibility
> - No console errors or warnings"

**File to Create:** `src/components/ui/*.tsx` (separate file for each component)

**Additional Details:**
```
- Component organization:
  * src/components/ui/Button.tsx
  * src/components/ui/Modal.tsx
  * src/components/ui/Card.tsx
  * etc.
- Create src/components/ui/index.ts that exports all components:
  * export { Button } from './Button';
  * export { Modal } from './Modal';
  * etc.
- All components dark-mode compatible:
  * Default bg-gray-900, text-white
  * Hover/active states use gray-800
  * Focus states have ring (accessibility)
- Animations use CSS @keyframes:
  * fade: opacity 0 → 1, duration 200ms
  * slideUp: transform translateY(10px) → 0, duration 200ms
  * pulse: opacity animation for loading
- Testing: all components should work independently without global state
```

---

### **Task 4.2 — Settings Screen**

**Deliverable:** A screen for user preferences, data management, and app settings.

**Exact Prompt to Code With:**
> "Create `src/components/SettingsScreen.tsx` — a full settings page:
> 
> 1. **Structure:**
>    - Header: 'Settings' title + back button
>    - Scrollable list of setting sections
>    - Each section: card-like with title + options
> 
> 2. **Settings Sections:**
> 
>    **A) Profile Settings**
>    - Edit name: Input field + save button
>    - Edit motivation: Text area (max 200 chars) + save
>    - Change energy peak: SegmentControl (morning / afternoon / night)
>    - Preview how this is used: 'Sage references your motivation in daily messages'
> 
>    **B) Study Constraints**
>    - Sleep time: time picker (bed time) + time picker (wake time)
>    - Available hours: weekday input (hrs) + weekend input (hrs)
>    - Break days: checkboxes for each day (which days can't study)
>    - Blocked time slots: list of college hours, can add/edit/delete
>    - Visual: show these as overlays on a sample daily calendar
> 
>    **C) Subject Management**
>    - List all subjects with their color, difficulty, deadline
>    - Edit button: opens modal to edit subject details
>    - Delete button: asks confirmation, removes subject + associated blocks
>    - Add subject button: opens modal with name, difficulty, deadline inputs
>    - Preview: shows count of blocks scheduled for each subject
> 
>    **D) App Preferences**
>    - Dark/light mode toggle (radio buttons: 'Auto', 'Dark', 'Light')
>    - Notification toggle: 'Enable push notifications' (checkbox)
>    - Pomodoro default: select from 25/5, 45/10, 50/10, custom input
>    - Proof mode: toggle 'Require photo proof' vs 'Allow skipping proof'
> 
>    **E) Data & Privacy**
>    - Export schedule: button → calls exportScheduleAsPDF() + exports schedule as iCal
>    - Export data: button → calls exportDataAsJSON() + downloads backup
>    - Import data: file input → allows importing JSON backup
>    - Clear all data: button (red, danger) → confirmation modal → calls dataStore.clearAllData()
>    - Show storage used: 'You're using ~[X] MB of Firebase'
> 
>    **F) About**
>    - App version: 'StudyOS v1.0.0'
>    - Links: Privacy Policy, Terms of Service (can be placeholders)
>    - Feedback button: opens mailto: link or suggests email
> 
> 3. **Edit Modals:**
>    - Subject edit modal:
>      * Fields: name, difficulty (slider 1-10), deadline (date picker)
>      * Color picker: 8-10 preset colors
>      * Save/Cancel buttons
>    - Blocked time slot modal:
>      * Day selector: dropdown (Monday—Sunday)
>      * Time range: from time + to time
>      * Repeat weekly: checkbox
>      * Save/Cancel
> 
> 4. **Validation:**
>    - Sleep time: sleep must be before wake (or across midnight)
>    - Deadline: must be in future
>    - Available hours: must be > 0
>    - Subject name: required, unique (can't have two 'Thermodynamics')
> 
> 5. **Confirmations:**
>    - Deleting subject: 'This will delete [Subject] and all its scheduled sessions. Continue?'
>    - Clearing data: 'This will delete all your data permanently. This cannot be undone. Type CLEAR to confirm.'
>    - Importing data: 'Importing will overwrite all current data. Continue?'
> 
> 6. **Save Flow:**
>    - On any setting change: show spinner
>    - Call appropriate appContext action (setUserProfile, etc.)
>    - On success: show toast 'Settings updated'
>    - On error: show toast '[Error message]'
> 
> 7. **Styling:**
>    - Dark mode by default
>    - Section cards: subtle borders or background color change
>    - Input fields: consistent with rest of app
>    - Buttons: use Button component from Task 4.1
> 
> **Implementation Checklist:**
> - [ ] All settings persist to context + Firebase
> - [ ] Edit modals open/close correctly
> - [ ] Validation prevents invalid entries
> - [ ] Export buttons work and download files
> - [ ] Import detects invalid files
> - [ ] Delete confirmations work
> - [ ] No console errors"

**File to Create:** `src/components/SettingsScreen.tsx`

**Additional Details:**
```
- Each setting section should be a separate subsection card
- Edit buttons for each subject: pencil icon
- Delete buttons for each subject: trash icon (red)
- Subject color picker: 10 preset colors (store as hex #RRGGBB)
- Deadline picker: use HTML5 date input (browser handles it well)
- Sleep/wake time: HTML5 time input (HH:MM format)
- Storage calculation: add up all Firebase key sizes (rough estimate)
- Export defaults:
  * PDF: StudyOS_Schedule_[Date].pdf
  * iCal: StudyOS_[userName].ics
  * JSON: StudyOS_Backup_[ISO Date].json
- Import: accept .json files only, validate schema before overwriting
```

---

### **Task 4.3 — Welcome/Splash Screen**

**Deliverable:** Entry point screen when user opens app for the first time.

**Exact Prompt to Code With:**
> "Create `src/components/WelcomeScreen.tsx` — splash/welcome screen:
> 
> 1. **Layout:**
>    - Full screen, gradient background (blue to purple)
>    - Center: StudyOS logo + tagline
>    - Tagline: 'Your AI study partner that actually adapts.'
> 
> 2. **Elements:**
>    - Logo: text or icon (or load from assets/logo.svg)
>    - Tagline: text below logo
>    - Three benefit bullets (small icons + text):
>      * 'AI adapts to you, not the other way around'
>      * 'Studies that fail get rescheduled automatically'
>      * 'See your real progress, not just your guilt'
>    - Primary button: 'Start with Sage' → navigates to OnboardingChat
>    - Secondary button: 'I have an account' → checks Firebase for userProfile
>      * If found: navigates to ScheduleView
>      * If not found: shows toast 'No account found. Starting fresh.'
> 
> 3. **Mobile Responsive:**
>    - Buttons stack vertically on mobile
>    - Logo size scales with viewport
>    - Text readable on all sizes
> 
> 4. **Styling:**
>    - Gradient background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) or similar
>    - Logo + tagline: white, large font
>    - Benefit bullets: smaller font, semi-transparent white
>    - Buttons: full width on mobile, 300px on desktop
> 
> 5. **Logic:**
>    - On mount: check if userProfile exists in Firebase
>    - If exists: optionally skip welcome screen (or show quick-start button)
>    - If not: show full welcome screen
>    - Navigation: use React Router or Next.js navigation
> 
> **Implementation Checklist:**
> - [ ] Logo displays correctly
> - [ ] Buttons navigate as expected
> - [ ] Responsive on mobile and desktop
> - [ ] Gradient background looks good
> - [ ] No API calls on this screen (all local)"

**File to Create:** `src/components/WelcomeScreen.tsx`

**Additional Details:**
```
- Background gradient colors: blues/purples that match brand
  * Option 1: #1e3c72 → #2a5298 (dark blue)
  * Option 2: #667eea → #764ba2 (purple)
- Logo: use text 'StudyOS' in bold sans-serif, or create SVG icon
- Benefit icons: use Lucide icons (Brain, Zap, TrendingUp, etc.)
- Button sizing: 
  * Mobile: 100% width with side padding
  * Desktop: auto width, centered, ~300px
- "I have an account" button: secondary variant (outlined, white text)
- No forms on this screen — just CTA buttons
```

---

### **Task 4.4 — Mobile Responsiveness & Accessibility**

**Deliverable:** Ensure the app works perfectly on mobile and meets accessibility standards.

**Exact Prompt to Code With:**
> "Create `src/styles/responsive.css` and update all components for mobile + accessibility:
> 
> 1. **Mobile Breakpoints (Tailwind-based):**
>    - sm: 640px (mobile landscape)
>    - md: 768px (tablet)
>    - lg: 1024px (desktop)
>    - xl: 1280px (wide desktop)
>    - Strategy: mobile-first design, progressively enhance for larger screens
> 
> 2. **Key Responsive Patterns:**
> 
>    **Layout Stacking:**
>    - Two-column layouts → stack to 1 column on mobile
>    - Use Tailwind: `<div className=\"grid grid-cols-1 md:grid-cols-2\">`
>    - Dashboard grids: 1 col (mobile) → 2 col (tablet) → 3 col (desktop)
> 
>    **Font Scaling:**
>    - Large headings: text-3xl (mobile) → text-4xl (desktop)
>    - Body text: base (16px) on all devices
>    - Never go below 16px on input fields (prevents auto-zoom on iOS)
> 
>    **Touch Targets:**
>    - All buttons: min 44x44px (accessibility standard)
>    - Spacing between buttons: min 8px
>    - Input fields: min 44px height on mobile
>    - Use Tailwind: `py-3 px-4` for buttons (ensures 44px height)
> 
>    **FullCalendar on Mobile:**
>    - Week view is hard to read on mobile
>    - Switch to 'dayGridDay' (single day view) on screens < 768px
>    - Add prev/next day navigation arrows
>    - Or use custom calendar component for mobile
> 
>    **Navigation:**
>    - Desktop: horizontal menu bar
>    - Mobile: hamburger menu (offcanvas drawer) OR bottom tab bar
>    - Bottom tab bar with 4 icons: Schedule, Chat, Dashboard, Settings
>    - Icons: use Lucide React
> 
> 3. **Accessibility Requirements (WCAG 2.1 AA):**
> 
>    **Color Contrast:**
>    - Text on background: contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
>    - Use color tools: WebAIM Contrast Checker
>    - Test all text colors in light + dark mode
> 
>    **Keyboard Navigation:**
>    - All interactive elements accessible via Tab key
>    - Focus states visible (use outline or ring)
>    - Buttons have :focus-visible style
>    - Modal traps focus (Tab stays within modal)
>    - Example: `<button className=\"focus:ring-2 focus:ring-blue-500\">Click me</button>`
> 
>    **ARIA Labels:**
>    - Buttons with only icons: add aria-label
>      * Example: `<button aria-label=\"Close menu\">×</button>`
>    - Form inputs: associate label with input via htmlFor
>      * Example: `<label htmlFor=\"email\">Email:</label><input id=\"email\" />`
>    - Dynamic content updates: use aria-live=\"polite\" for notifications
>      * Example: `<div aria-live=\"polite\">Schedule updated!</div>`
> 
>    **Semantic HTML:**
>    - Use correct elements: <button> for buttons, <a> for links, <label> for labels
>    - Never use <div> as button (use <button> instead)
>    - Form inputs in <form> with <fieldset> for groups
> 
>    **Focus Management:**
>    - When modal opens: focus should move into modal
>    - When modal closes: focus returns to button that opened it
>    - When content changes: announce via aria-live if important
> 
> 4. **Testing Checklist:**
>    - [ ] Tab through entire app with keyboard only
>    - [ ] Screen reader test (use NVDA or JAWS on Windows, VoiceOver on Mac)
>    - [ ] Zoom to 200%: all content still readable and functional
>    - [ ] Color contrast: use WebAIM tool on all text colors
>    - [ ] Mobile view: test on iPhone 12, Samsung Galaxy (Chrome DevTools)
>    - [ ] Touch targets: all buttons at least 44x44px
>    - [ ] No time limits: users can interact at their own pace
> 
> 5. **CSS Updates:**
>    - Create `src/styles/responsive.css` with custom media queries if needed
>    - Dark mode: use prefers-color-scheme media query
>    - Reduced motion: use prefers-reduced-motion for animations
>      * Example: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`
> 
> 6. **Component Adjustments:**
>    - Update all components from Task 4.1 + others
>    - Add Tailwind responsive classes
>    - Add ARIA labels where needed
>    - Add focus states to all interactive elements
> 
> **Implementation Checklist:**
> - [ ] App responsive on mobile/tablet/desktop
> - [ ] All buttons ≥ 44x44px
> - [ ] Keyboard navigation works
> - [ ] Focus states visible
> - [ ] ARIA labels on icon buttons
> - [ ] Color contrast ≥ 4.5:1
> - [ ] Forms have proper labels
> - [ ] Modal focus trap works
> - [ ] Screen reader announces important updates"

**File to Create:** `src/styles/responsive.css` + updates to existing components

**Additional Details:**
```
- Tailwind responsive prefixes: sm:, md:, lg:, xl:
- Focus ring style: focus:ring-2 focus:ring-blue-500 focus:outline-none
- ARIA labels for icon buttons: all microphone, send, delete, etc. buttons
- Form labels: always use <label htmlFor="inputId"> and <input id="inputId">
- Modal focus: use autoFocus on first focusable element, or useEffect to focus()
- Color contrast: test with browser DevTools (Lighthouse) or WebAIM contrast checker
- Touch: buttons/inputs need 44px min, spacing of 8px between touch targets
- Mobile menu: use bottom tab bar pattern (4 icons at bottom for Schedule, Chat, Dashboard, Settings)
- FullCalendar mobile: use list view or day view on screens < 768px
- Reduced motion: remove animations if user prefers (use @media prefers-reduced-motion)
```

---

### **Task 4.5 — Error Boundaries & Loading States**

**Deliverable:** Graceful error handling and loading UX throughout the app.

**Exact Prompt to Code With:**
> "Create `src/components/ErrorBoundary.tsx` + `src/components/LoadingState.tsx`:
> 
> 1. **Error Boundary Component (`ErrorBoundary.tsx`):**
>    - React error boundary for catching JS errors in component tree
>    - On error:
>      * Display user-friendly message: 'Something went wrong. Please refresh or go back.'
>      * Show error details in dev mode (console + expandable section)
>      * Log error to console
>      * Provide action buttons: 'Refresh Page' + 'Go Back'
>    - Wrap entire app in this component in App.tsx
> 
> 2. **API Error Handling:**
>    - For Person 1's qrok API calls that fail:
>      * Show toast: '[Action] failed. Retrying...'
>      * Auto-retry up to 3 times
>      * If all retries fail: show modal with error + 'Try Again' button
>      * Log error details for debugging
>    - Examples:
>      * Schedule generation fails: 'Could not generate schedule. Using previous schedule.'
>      * Proof verification fails: 'Verification service unavailable. Session marked unverified.'
> 
> 3. **Loading States:**
>    - Full-screen spinner: when loading scheduleBlocks, userProfile on app startup
>    - Skeleton loaders: for dashboard cards (shimmer effect)
>    - Button loading state: spinner inside button, disabled while loading
>    - Toast-based status: 'Generating schedule...' toast appears, disappears on success/error
> 
> 4. **Form Validation Errors:**
>    - Display inline below input field (red text, small font)
>    - Example: Input with red border + error message below
>    - Clear error on user edit (while typing)
>    - Show error on blur or submit attempt
> 
> 5. **Network Status:**
>    - Detect offline (navigator.onLine)
>    - Show banner at top: 'You're offline. Some features unavailable.'
>    - Banner color: orange/yellow
>    - Hide banner when back online
>    - Store failed API calls and retry when online
> 
> 6. **Empty States:**
>    - No schedule: 'Create your first schedule' with button to generate
>    - No completed sessions: 'Start a session to track your progress'
>    - No subjects added: 'Add subjects to get started'
>    - Each empty state: icon + message + CTA button
> 
> **Implementation Checklist:**
> - [ ] Error boundary catches errors without crashing app
> - [ ] API errors retry gracefully
> - [ ] Loading states appear while fetching
> - [ ] Offline banner appears and disappears correctly
> - [ ] Form validation shows clear errors
> - [ ] Empty states guide user to next action"

**File to Create:** `src/components/ErrorBoundary.tsx`, `src/components/LoadingState.tsx`

**Additional Details:**
```
- Error boundary: componentDidCatch() hook, state: { hasError, error }
- Retry logic: implement in Person 1's API calls with exponential backoff
  * Retry delays: 1s, 2s, 4s (total 7s before giving up)
- Offline detection: addEventListener('online'/'offline') on window
- Skeleton loader: use CSS animation or simple gray placeholder divs
- Empty state illustrations: use Lucide icons (Brain, Plus, Clock, etc.)
- Form error display: <span className="text-red-500 text-sm">{error}</span>
- Network banner: position fixed top, z-index high, bg-yellow-600
```

---

# **SUMMARY TABLE**

| Person | Role | Key Deliverables | Start with | End Result |
|--------|------|------------------|-----------|-----------|
| **Person 1** | AI & Backend Logic | System prompts, API integration, schedule generator, cascade rescheduler, proof verifier, check-in engine, weekly reports | Task 1.1 | Complete AI orchestration layer, all qrok calls work, schedule regenerates on missed sessions |
| **Person 2** | Frontend UI | React components, calendar view, session timer, dashboard, chat interface | Task 2.1 | Full UI with all screens, FullCalendar integrated, responsive design tested |
| **Person 3** | Data Management | Firebase schema, React Context, export/import, time utilities | Task 3.1 | Persistent data layer, global state management, all data survives refresh |
| **Person 4** | Components & Polish | Reusable component library, settings screen, welcome screen, responsive + accessibility | Task 4.1 | Beautiful, accessible, mobile-friendly UI, 100+ screens work perfectly |

---

**Total Build Time:** 12 hours (divide into 4 phases: 3h setup, 4h core features, 3h polish + testing, 2h buffer/fixes)  
**Handoff points:** After each phase, verify Person X's work before next person builds on it.

---

This is your **complete 4-person hackathon breakdown**. Every person has explicit tasks, exact code prompts, deliverables, and what "done" looks like. 🚀