import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRO1jdrcjrJZEDcRorjU_qxL5c0TLpjq4",
    authDomain: "ticket-system-9e97c.firebaseapp.com",
    projectId: "ticket-system-9e97c",
    storageBucket: "ticket-system-9e97c.firebasestorage.app",
    messagingSenderId: "755241576733",
    appId: "1:755241576733:web:ca030b2eadf08f7716d9f4",
    measurementId: "G-MSBRJ539CE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Save ticket to Firebase
export async function saveTicket(ticket) {
    try {
        const docRef = await addDoc(collection(db, "tickets"), ticket);
        console.log("Ticket added with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding ticket:", error);
        throw error;
    }
}

// Load all tickets from Firebase
export async function loadTickets() {
    try {
        const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const tickets = [];
        querySnapshot.forEach(doc => {
            tickets.push({ ...doc.data(), firebaseId: doc.id });
        });
        return tickets;
    } catch (error) {
        console.error("Error loading tickets:", error);
        throw error;
    }
}

// Update ticket in Firebase
export async function updateTicket(ticketId, newData) {
    try {
        const docRef = doc(db, "tickets", ticketId);
        await updateDoc(docRef, newData);
        console.log("Ticket updated:", ticketId);
    } catch (error) {
        console.error("Error updating ticket:", error);
        throw error;
    }
}

// Delete ticket from Firebase
export async function deleteTicket(ticketId) {
    try {
        await deleteDoc(doc(db, "tickets", ticketId));
        console.log("Ticket deleted:", ticketId);
    } catch (error) {
        console.error("Error deleting ticket:", error);
        throw error;
    }
}