# Use Case Diagram Details: CP Check (Event Management System)

This document provides the necessary details to construct a Use Case Diagram for the project, based on the codebase and database schema analysis.

## 1. System Boundary
- **Name**: CP Check / ระบบจัดการกิจกรรม (Event Management System)

## 2. Actors (บุคคลที่เกี่ยวข้อง)
According to the `users.role` in the database and the frontend structure:

1.  **Student (นักศึกษา)**: Primary users who search for and participate in activities.
2.  **Organizer (ผู้จัดกิจกรรม)**: Secondary users who create and manage activities.
3.  **Admin (ผู้ดูแลระบบ)**: Users with full control over the system data.

## 3. Use Cases (ฟังก์ชันการใช้งาน)

### A. Common Use Cases (ฟังก์ชันพื้นฐาน)
- **สมัครสมาชิก (Register)**: Create a new account with 'student' or 'organizer' role.
- **เข้าสู่ระบบ (Login)**: Access the system.
- **ดูข้อมูลส่วนตัว (View Profile)**: View and edit personal information.

### B. Student (นักศึกษา)
- **ค้นหาและดูกิจกรรม (Search & View Events)**: Browse available events by category or tags.
- **ดูรายละเอียดกิจกรรม (View Event Details)**: View descriptions, requirements, and benefits.
- **ลงทะเบียนเข้าร่วมกิจกรรม (Register for Event)**: Join an open activity.
- **ยกเลิกการลงทะเบียน (Cancel Registration)**: Opt-out before the deadline.
- **ดูประวัติการลงทะเบียน (View Registration History)**: Keep track of joined activities.
- **เช็คชื่อเข้าร่วมกิจกรรม (Check-in / Attendance)**: Check-in via QR Code or method provided.
- **ดาวน์โหลดเกียรติบัตร (Download Certificate)**: Collect certificates for completed activities.

### C. Organizer (ผู้จัดกิจกรรม)
- **สร้างกิจกรรมใหม่ (Create Activity)**: Input details, conditions, and capacity.
- **จัดการกิจกรรม (Manage Activity)**: Edit or delete existing activities managed by them.
- **ตรวจสอบรายชื่อผู้สมัคร (Review Registrations)**: View the list of students who registered.
- **อนุมัติการลงทะเบียน (Approve Registration)**: Confirm participants.
- **เช็คชื่อผู้เข้าร่วม (Mark Attendance)**: Scan QR codes or manually mark attendance.
- **ออกเกียรติบัตร (Issue Certificate)**: Generate certificates for students who attended.

### D. Admin (ผู้ดูแลระบบ)
- **จัดการผู้ใช้งาน (Manage Users)**: View, edit, or delete user accounts.
- **จัดการกิจกรรมทั้งหมด (Manage All Activities)**: Oversee all platform events.

## 4. Relationships (ความสัมพันธ์)
- **Extend/Include**:
    - **Login** (Include) -> Required for almost all use cases except viewing public event lists.
    - **Mark Attendance** (Include) -> Required for **Issue Certificate**.
    - **View Details** (Include) -> Part of **Search & View Events**.

---
> [!TIP]
> When drawing the diagram in tools like Draw.io:
> - Use the **Boundary** box to enclose all use cases.
> - Place **Actors** (stick figures) outside the box.
> - Use **Lines (Solid)** to connect actors to the use cases they interact with.
