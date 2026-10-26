# Student Management System

A full-stack web application designed to simplify student information management for schools, colleges, and educational institutions.

## 📌 About the Project

The Student Management System (SMS) is a web-based application that helps administrators manage student records efficiently. It provides a centralized platform to create, view, update, and delete student information.

The project aims to reduce manual work, improve data accuracy, and make student information easier to access and manage.

## 🎯 Project Objectives

- Digitize student information management.
- Provide an easy-to-use administrative dashboard.
- Perform CRUD operations on student records.
- Organize student data in a relational database.
- Improve data accuracy and consistency.
- Build a scalable foundation for future academic management features.

## ✨ Features

### Version 1 — Core Features

- **Dashboard:** Display student statistics and system summaries.
- **Student Management:** Create, view, update, and delete student records.
- **Student Search:** Search students by name or student code.
- **Student Details:** View individual student information.
- **Form Validation:** Validate required fields and prevent duplicate student codes.
- **Database Integration:** Store student information in MySQL.
- **REST API:** Connect the frontend to the backend through API endpoints.
- **Responsive UI:** Support desktop, tablet, and mobile screens.

### Planned Features

- User authentication and role-based access control.
- Teacher and class management.
- Subject management.
- Student attendance tracking.
- Exam and assignment score management.
- Academic reports and grade calculation.
- Excel and PDF export.
- Audit logs and administrative settings.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Vue.js | Frontend user interface |
| HTML5 | Page structure |
| CSS3 | Styling and responsive design |
| JavaScript | Frontend functionality |
| Laravel | Backend application and REST API |
| PHP | Backend programming language |
| MySQL | Relational database |
| Axios | HTTP requests between frontend and backend |
| Git | Version control |
| GitHub | Source code hosting |
| Postman | API testing |
| Visual Studio Code | Development environment |

## 🏗️ System Architecture

The application follows a frontend–backend–database architecture.

```text
                 ADMIN / USER
                      |
                      v
             +------------------+
             |   Vue.js UI      |
             | Forms and Tables |
             +------------------+
                      |
                 HTTP / JSON
                      |
                      v
             +------------------+
             |   Laravel API    |
             | Controllers      |
             | Validation        |
             | Business Logic   |
             +------------------+
                      |
                 Eloquent ORM
                      |
                      v
             +------------------+
             |   MySQL Database |
             | Student Records  |
             +------------------+
```

### How It Works

1. The user interacts with the Vue.js interface.
2. Vue.js sends an HTTP request to the Laravel API.
3. Laravel validates the request and processes the data.
4. Laravel communicates with MySQL using Eloquent ORM.
5. The API returns a JSON response.
6. Vue.js displays the updated information to the user.

## 📂 Project Structure

```text
student-management-system/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── views/
│   │   ├── router/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   └── Requests/
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   ├── config/
│   ├── .env.example
│   ├── composer.json
│   └── artisan
│
└── README.md
```

*Note: This is the proposed structure. Some folders, files, and API routes may need to be created as development progresses.*

## 🗄️ Database Design

The initial version focuses on student records.

### Students Table

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Primary key |
| student_code | VARCHAR(30) | Unique student identifier |
| full_name | VARCHAR(150) | Student's full name |
| gender | VARCHAR(20) | Gender, if collected |
| date_of_birth | DATE | Date of birth, if collected |
| email | VARCHAR(150) | Contact email, optional |
| phone | VARCHAR(30) | Contact number, optional |
| class_id | BIGINT, nullable | Reference to a class, when implemented |
| status | VARCHAR(20) | Enrollment status |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

Additional tables can include:

- `users` — system accounts and roles.
- `classes` — class information.
- `subjects` — subjects offered by the institution.
- `enrollments` — student class registrations.
- `scores` — student assessment results.
- `attendance` — student attendance records.

The final schema should use appropriate foreign keys, unique constraints, validation, and indexes. Authentication accounts should be kept separate from student profile records.

## 🔌 API Endpoints

The following endpoints are planned for student management.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students` | Retrieve all students |
| GET | `/api/students/{id}` | Retrieve a student by ID |
| POST | `/api/students` | Create a student |
| PUT | `/api/students/{id}` | Update a student |
| DELETE | `/api/students/{id}` | Delete a student |

These endpoints should be implemented and tested in Laravel before being treated as available.

## ⚙️ Installation and Setup

### Prerequisites

Install the following tools before starting:

- Node.js and npm
- PHP compatible with your Laravel version
- Composer
- MySQL
- Git
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
cd student-management-system
```

Replace the placeholder with your actual repository URL.

### 2. Set Up the Backend

```bash
cd backend
composer install
```

Create your local environment file:

```bash
cp .env.example .env
```

On Windows, you can also copy `.env.example` to `.env` manually.

Generate the application key:

```bash
php artisan key:generate
```

Create a MySQL database named `student_management`.

Update your backend `.env` configuration:

```env
APP_NAME="Student Management System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=student_management
DB_USERNAME=root
DB_PASSWORD=
```

Adjust the database username and password to match your local MySQL configuration.

Run the database migrations:

```bash
php artisan migrate
```

Start the backend server:

```bash
php artisan serve
```

The Laravel development server should be available at:

`http://127.0.0.1:8000`

### 3. Set Up the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal, commonly:

`http://localhost:5173`

If Axios is used for API requests, install it with:

```bash
npm install axios
```

### 4. Connect the Frontend to the Backend

Configure the API base URL in the frontend environment file, for example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Restart the Vite server after changing environment variables.

Configure Laravel CORS appropriately for the local frontend origin. Do not disable security protections as a workaround.

## 🧪 Testing

Test the following before considering the initial version complete:

- Create a student with valid information.
- Reject invalid or missing required fields.
- Reject duplicate student codes.
- Retrieve all students and individual student records.
- Update existing student information.
- Delete a student with appropriate confirmation.
- Search students by name or student code.
- Verify that records