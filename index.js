
const express = require('express');
const mongoose = require('mongoose');
const Mentor = require('./models/Mentor');
const Student = require('./models/Student');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/mentorship');
// { useNewUrlParser: true, useUnifiedTopology: true }
 
// Create Mentor
app.post('/mentors', async (req, res) => {
    const mentor = new Mentor(req.body);
    await mentor.save();
    res.status(201).send(mentor);
});

// Create Student
app.post('/students', async (req, res) => {
    const student = new Student(req.body);
    await student.save();
    res.status(201).send(student);
});

// Assign a student to a mentor
app.post('/mentors/:mentorId/students/:studentId', async (req, res) => {
    const { mentorId, studentId } = req.params;
    const mentor = await Mentor.findById(mentorId);
    const student = await Student.findById(studentId);

    if (student.mentor) {
        return res.status(400).send('Student already has a mentor');
    }

    student.mentor = mentor._id;
    mentor.students.push(student._id);

    await student.save();
    await mentor.save();

    res.send(mentor);
});

// Assign multiple students to a mentor
app.post('/mentors/:mentorId/students', async (req, res) => {
    const { mentorId } = req.params;
    const { studentIds } = req.body;
    const mentor = await Mentor.findById(mentorId);

    const students = await Student.find({ _id: { $in: studentIds }, mentor: null });

    students.forEach(student => {
        student.mentor = mentor._id;
        mentor.students.push(student._id);
    });

    await Promise.all(students.map(student => student.save()));
    await mentor.save();

    res.send(mentor);
});

// Change mentor for a student
app.put('/students/:studentId/mentor/:mentorId', async (req, res) => {
    const { studentId, mentorId } = req.params;
    const student = await Student.findById(studentId);
    const newMentor = await Mentor.findById(mentorId);

    if (student.mentor) {
        const oldMentor = await Mentor.findById(student.mentor);
        oldMentor.students.pull(student._id);
        await oldMentor.save();
    }

    student.previousMentors.push(student.mentor);
    student.mentor = newMentor._id;
    newMentor.students.push(student._id);

    await student.save();
    await newMentor.save();

    res.send(student);
});

// Get all students for a particular mentor
app.get('/mentors/:mentorId/students', async (req, res) => {
    const { mentorId } = req.params;
    const mentor = await Mentor.findById(mentorId).populate('students');
    res.send(mentor.students);
});

// Get previously assigned mentors for a student
app.get('/students/:studentId/previous-mentors', async (req, res) => {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).populate('previousMentors');
    res.send(student.previousMentors);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
