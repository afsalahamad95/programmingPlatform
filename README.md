<h1 align="center">📝 Online Test Platform</h1>  

<p align="center">  
A flexible, secure and efficient platform designed for creating and attempting tests with various question types, automated scheduling, and advanced functionalities for administrators and users.  
</p>  

---

## 🚀 Features  

### 🎯 Admin Frontend  
- 🛠️ **Dashboard** for creating tests, adding questions, and managing students.  
- 📊 View and manage test details efficiently.
- Metrics and analytics
- Efficient test and student management

### 🌐 Client Frontend  
- 🎓 **Student-Friendly Interface**: Simple and interactive interface for students to attempt tests.  
- 📝 Supports multiple question types, including:  
  - Multiple-Choice Questions (MCQs)  
  - Subjective Questions  
  - Coding Challenges
  - Interview questions
  - Profile page with integrated certification section and much more.
 
### 👤 **User Management Module**: Handle student and instructor accounts. 

### 🔧 Backend  
- 🔗 **Database Integration**: Connects the platform to the database and handles core business logic.  
- 📅 **Test Management**: Manages test scheduling, question organization, and student data.  

### 💻 Code Execution Engine  
- ⚡ **Real-Time Code Execution**: Executes coding challenges during tests.  
- 🔒 **Secure Evaluation**: Scalable solution for evaluating code submissions.
- Multi-language support(Python, Javascript and C++ as of now), will include more in the future.

---

## ✨ Functionalities  
- **Flexible Question Creation**:  
  📋 Supports creation of MCQs, subjective questions, and coding challenges.  
- **Organized Content**:  
  📚 Automatically categorizes questions by subject for better organization.  
- **Test Scheduling**:  
  ⏲️ Allows scheduling of tests with defined time limits.  
- ✅ **Automated Grading & Results**: Automatically grade submissions and generate results.  
- 📈 **Analytics & Reporting**: Provide insights into student performance and test metrics.
- **Timed tests and live reloading result pages**: The platform has a built-in live-reload option for live results, and the tests can be configured with time limits.
- Optimized backend API performance with golang.

---

## 📝 TODO   
- Include contest feature and live meetups(short meetings configurable from 1 to 3 hours)

---

## 🛠️ Tech Stack  
- **Frontend**: React - typescript + vite
- **Backend**: Go  
- **Database**: MongoDB  

---

## ⚙️ Setup and Installation  

### 🔑 Prerequisites  
- Node.js, typescript for frontend.  
- [Go](https://golang.org/) for backend.  
- MongoDB for database.
- Install Judge0 for local code execution.

### 🖥️ Installation  

#### Frontend (Admin & Client)  
1. Navigate to the respective frontend directories (adminFrontend/ or clientFrontend/).  
2. Install dependencies:   
   npm install  
Start the frontend:
npm run dev  
Default URL: http://localhost:5173
Backend
Navigate to the backend/ directory.
Install dependencies:
go mod tidy  
Start the backend server:
go run main.go  
Default URL: http://localhost:3000
Code Execution Engine
Ensure the execution engine runs on:
Default URL: http://localhost:8080
📁 Directory Structure
.  
├── adminFrontend/  
├── clientFrontend/  
├── backend/  
└── codeExecutionEngine/

🌐 Development URLs(default)
Admin Frontend: http://localhost:5173
Client Frontend: http://localhost:5174
Backend: http://localhost:3000
Code Execution Engine: http://localhost:8081
