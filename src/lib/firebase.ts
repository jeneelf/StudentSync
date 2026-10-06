import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Course, StudyDeadline, LearningPreferences } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

// Firestore Database Sync Helpers
export async function syncCourseToFirestore(userId: string, course: Course): Promise<void> {
  try {
    const courseRef = doc(db, 'users', userId, 'courses', course.id);
    await setDoc(courseRef, {
      ...course,
      userId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to sync course to Firestore:', err);
  }
}

export async function deleteCourseFromFirestore(userId: string, courseId: string): Promise<void> {
  try {
    const courseRef = doc(db, 'users', userId, 'courses', courseId);
    await deleteDoc(courseRef);
  } catch (err) {
    console.error('Failed to delete course from Firestore:', err);
  }
}

export async function loadUserCoursesFromFirestore(userId: string): Promise<Course[]> {
  try {
    const coursesRef = collection(db, 'users', userId, 'courses');
    const snapshot = await getDocs(coursesRef);
    const courses: Course[] = [];
    snapshot.forEach((d) => {
      courses.push(d.data() as Course);
    });
    return courses;
  } catch (err) {
    console.error('Failed to load courses from Firestore:', err);
    return [];
  }
}

export async function syncDeadlineToFirestore(userId: string, deadline: StudyDeadline): Promise<void> {
  try {
    const dlRef = doc(db, 'users', userId, 'deadlines', deadline.id);
    await setDoc(dlRef, { ...deadline, userId }, { merge: true });
  } catch (err) {
    console.error('Failed to sync deadline to Firestore:', err);
  }
}

export async function deleteDeadlineToFirestore(userId: string, deadlineId: string): Promise<void> {
  try {
    const dlRef = doc(db, 'users', userId, 'deadlines', deadlineId);
    await deleteDoc(dlRef);
  } catch (err) {
    console.error('Failed to delete deadline from Firestore:', err);
  }
}

export async function loadUserDeadlinesFromFirestore(userId: string): Promise<StudyDeadline[]> {
  try {
    const dlRef = collection(db, 'users', userId, 'deadlines');
    const snapshot = await getDocs(dlRef);
    const deadlines: StudyDeadline[] = [];
    snapshot.forEach((d) => {
      deadlines.push(d.data() as StudyDeadline);
    });
    return deadlines;
  } catch (err) {
    console.error('Failed to load deadlines from Firestore:', err);
    return [];
  }
}
