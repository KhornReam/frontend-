## 🗄️ Database Tables

**Database Name:** `student_management`

| No. | Table Name | Description |
|---:|---|---|
| 1 | `users` | Stores user accounts, passwords, roles, and account status. |
| 2 | `students` | Stores student profiles and personal information. |
| 3 | `teachers` | Stores teacher information. |
| 4 | `classes` | Stores class names, rooms, and academic years. |
| 5 | `subjects` | Stores subject names, codes, and descriptions. |
| 6 | `enrollments` | Connects students to classes and academic years. |
| 7 | `class_subjects` | Assigns subjects and teachers to classes. |
| 8 | `attendance` | Records student attendance. |
| 9 | `assessments` | Stores exams, quizzes, and assignment information. |
| 10 | `scores` | Stores student assessment scores and results. |

### Database Relationships

- `users` → `students`: User accounts linked to student profiles.
- `users` → `teachers`: User accounts linked to teacher profiles.
- `teachers` → `classes`: Teachers assigned as homeroom teachers.
- `students` → `enrollments`: One student can have multiple enrollment records.
- `classes` → `enrollments`: One class can contain multiple students.
- `classes` → `class_subjects`: One class can have multiple subjects.
- `subjects` → `class_subjects`: One subject can be assigned to multiple classes.
- `teachers` → `class_subjects`: One teacher can teach multiple class-subject assignments.
- `students` → `attendance`: One student can have multiple attendance records.
- `class_subjects` → `assessments`: One class-subject assignment can have multiple assessments.
- `assessments` → `scores`: One assessment can have multiple student scores.
- `students` → `scores`: One student can have multiple assessment scores.
