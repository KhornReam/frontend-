# 🎓 StudentHub — Student Management System

A modern, full-stack Student Management System designed to help schools and training centers manage student information, classes, attendance, grades, and academic performance efficiently.

Built with **Vue 3, Laravel, and MySQL**, this project demonstrates practical full-stack development, REST API integration, database design, and software engineering principles.

## 📌 Project Overview

StudentHub provides a centralized platform for managing academic information through a clean, responsive, and user-friendly interface.


> **Note:** Features are planned for implementation in phases. Update this section as each feature is completed and tested.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Vue 3 | Frontend framework |
| Vite | Frontend development and build tool |
| JavaScript | Frontend programming |
| Vue Router | Client-side routing |
| Pinia | State management |
| Axios | HTTP requests to the API |
| Laravel | Backend framework |
| PHP | Backend programming |
| MySQL | Relational database |
| Laravel Sanctum | API authentication, where appropriate |
| Bootstrap 5 / CSS | Responsive user interface |
| Chart.js | Dashboard charts |
| Git & GitHub | Version control |



### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/studenthub.git
cd studenthub
```

Replace `YOUR_USERNAME` with your GitHub username and adjust the repository URL to match your actual repository.

### 2. Configure the Backend

```bash
cd backend
composer install
```

Create the environment file:

**Windows Command Prompt:**
```cmd
copy .env.example .env
```

Generate the Laravel application key:

```bash
php artisan key:generate
```

Update the database settings in `backend/.env`:

```env
APP_NAME=StudentHub
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=test
DB_USERNAME=root
DB_PASSWORD=
```

Use your actual MySQL username and password. Do not commit `.env` to GitHub.

Create the `studenthub` database in MySQL, then run:

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

Run the seeder command after creating the required seeders. If seeders are not ready yet, skip `php artisan db:seed`.

The Laravel API will normally be available at:

`http://127.0.0.1:8000`

### 3. Configure the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure the frontend API base URL in your Axios configuration, for example:





## 🧪 Testing

Use the following commands from the backend directory:

```bash
php artisan test
```

Build the frontend for production:

```bash
cd frontend
npm run build
```

Test API requests using Postman and verify that validation, authentication, permissions, and database operations behave correctly.

## 🔒 Security

- Store secrets and credentials in environment variables.
- Validate all incoming data on the backend.
- Enforce role-based authorization for protected operations.
- Use secure password hashing.
- Restrict access to private student information.
- Validate uploaded files and limit their allowed types and sizes.
- Never expose production credentials or sensitive student data in source control.


