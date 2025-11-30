import { saveTicket, loadTickets, updateTicket } from "./firebase.js";

// Departments list consistent across UI
const DEPARTMENTS = [
    "Robotics Software",
    "Robotics Electronics",
    "Application Team",
    "Production",
    "Mechanical",
    "Purchase",
    "Sales / Customer Success",
    "Project",
];

// Global tickets array
let tickets = [];

// Utilities
const uid = () => "T-" + Math.random().toString(36).slice(2, 9).toUpperCase();
const nowISO = () => new Date().toISOString();

// Load from Firebase
async function load() {
    try {
        tickets = await loadTickets();
        renderTickets();
    } catch (error) {
        console.error("Error loading tickets:", error);
        alert("Error loading tickets. Check console for details.");
    }
}

// Save to Firebase
async function save() {
    try {
        renderTickets();
        computeAnalytics();
    } catch (error) {
        console.error("Error saving tickets:", error);
        alert("Error saving tickets. Check console for details.");
    }
}

// Create ticket
document.getElementById("ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ticketData = {
        id: uid(),
        title: document.getElementById("title").value.trim(),
        robotId: document.getElementById("robotId").value.trim(),
        issueType: document.getElementById("issueType").value,
        priority: document.getElementById("priority").value,
        departmentOwner: document.getElementById("departmentOwner").value,
        status: "New",
        assignedTo: null,
        description: document.getElementById("description").value.trim(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        history: [
            {
                action: "Created",
                by: "System",
                at: nowISO(),
                notes: "Initial creation",
            },
        ],
    };

    try {
        await saveTicket(ticketData);
        tickets.unshift(ticketData);
        save();
        e.target.reset();
        alert("Ticket created — ID: " + ticketData.id);
    } catch (error) {
        console.error("Error creating ticket:", error);
        alert("Error creating ticket. Check console for details.");
    }
});

// Render tickets list
function renderTickets(list = tickets) {
    const container = document.getElementById("ticketsContainer");
    container.innerHTML = "";
    document.getElementById("totalCount").textContent = list.length;

    let handoverCount = 0;
    let openCount = 0;
    list.forEach((t) => {
        if (["Handover Pending", "Handed Over"].includes(t.status))
            handoverCount++;
        if (!["Resolved", "Closed"].includes(t.status)) openCount++;

        const el = document.createElement("div");
        el.className =
            "p-3 bg-white rounded-lg shadow-sm flex justify-between items-start";
        el.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center gap-3">
                    <div class="font-semibold">${t.title}</div>
                    <div class="text-xs text-slate-500">${t.id}</div>
                    <div class="ml-2 badge bg-slate-100 text-slate-700">${
                        t.issueType
                    }</div>
                </div>
                <div class="text-sm text-slate-600 mt-1">Robot: ${
                    t.robotId || "—"
                }</div>
                <div class="text-xs text-slate-500 mt-1">Owner: ${
                    t.departmentOwner
                } • Status: <strong>${t.status}</strong></div>
            </div>
            <div class="flex flex-col items-end gap-2">
                <div class="text-sm">Priority: <strong>${
                    t.priority
                }</strong></div>
                <div class="flex gap-2">
                    <button class="openBtn px-2 py-1 bg-slate-200 rounded" data-id="${
                        t.id
                    }">Open</button>
                    <button class="handoverBtn px-2 py-1 bg-amber-100 rounded" data-id="${
                        t.id
                    }">Handover</button>
                </div>
            </div>
        `;
        container.appendChild(el);
    });

    document.getElementById("handoverCount").textContent = handoverCount;
    document.getElementById("openCount").textContent = openCount;

    // Attach open handlers
    document
        .querySelectorAll(".openBtn")
        .forEach((b) =>
            b.addEventListener("click", (e) => openModal(e.target.dataset.id))
        );
    document
        .querySelectorAll(".handoverBtn")
        .forEach((b) =>
            b.addEventListener("click", (e) =>
                quickHandoverPrompt(e.target.dataset.id)
            )
        );
}

// Quick handover prompt
async function quickHandoverPrompt(id) {
    const t = tickets.find((x) => x.id === id);
    if (!t) return;
    const next = prompt(
        "Enter next department (exact):\n" + DEPARTMENTS.join("\n")
    );
    if (!next) return;
    if (!DEPARTMENTS.includes(next)) {
        alert("Invalid department. Choose from:\n" + DEPARTMENTS.join("\n"));
        return;
    }
    const notes = prompt("Add handover notes (required)");
    if (!notes) {
        alert("Handover notes required");
        return;
    }

    try {
        t.history.push({
            action: "Handover Initiated",
            by: "User",
            at: nowISO(),
            notes: `To: ${next} | ${notes}`,
        });
        t.previousOwner = t.departmentOwner;
        t.departmentOwner = next;
        t.status = "Handed Over";
        t.updatedAt = nowISO();
        await updateTicket(t.firebaseId, t);
        save();
        alert("Handover complete");
    } catch (error) {
        console.error("Error during handover:", error);
        alert("Error during handover. Check console for details.");
    }
}

// Modal logic
let currentModalId = null;
function openModal(id) {
    currentModalId = id;
    const t = tickets.find((x) => x.id === id);
    if (!t) return;
    document.getElementById("modalTitle").textContent = t.title + " • " + t.id;
    document.getElementById("modalSubtitle").textContent = `${
        t.issueType
    } • Created: ${new Date(t.createdAt).toLocaleString()}`;
    document.getElementById("mRobot").textContent = t.robotId || "—";
    document.getElementById("mPriority").textContent = t.priority;
    document.getElementById("mType").textContent = t.issueType;
    document.getElementById("mOwner").textContent = t.departmentOwner;
    document.getElementById("mStatus").textContent = t.status;
    document.getElementById("mAssigned").textContent = t.assignedTo || "—";
    document.getElementById("mDesc").textContent = t.description || "—";

    // populate history
    const hist = document.getElementById("historyList");
    hist.innerHTML = "";
    t.history
        .slice()
        .reverse()
        .forEach((h) => {
            const d = document.createElement("div");
            d.className = "p-2 bg-slate-50 rounded";
            d.innerHTML = `<div class="text-xs text-slate-500">${new Date(
                h.at
            ).toLocaleString()}</div><div class="text-sm">${h.action} — <em>${
                h.by
            }</em></div><div class="text-sm text-slate-700">${
                h.notes || ""
            }</div>`;
            hist.appendChild(d);
        });

    document.getElementById("modal").classList.remove("hidden");
}

// Close modal
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden");
});

// Save action from modal (handover / status / assign)
document.getElementById("saveAction").addEventListener("click", async () => {
    const t = tickets.find((x) => x.id === currentModalId);
    if (!t) return alert("No ticket selected");
    const nextDept = document.getElementById("handoverDept").value;
    const status = document.getElementById("statusSelect").value;
    const assign = document.getElementById("assignTo").value.trim();
    const notes = document.getElementById("handoverNotes").value.trim();

    try {
        if (nextDept) {
            if (!notes)
                return alert(
                    "Handover notes required when transferring department"
                );
            t.history.push({
                action: `Handover ${t.departmentOwner} → ${nextDept}`,
                by: "User",
                at: nowISO(),
                notes,
            });
            t.previousOwner = t.departmentOwner;
            t.departmentOwner = nextDept;
            t.status = "Handed Over";
        }

        if (assign) {
            t.assignedTo = assign;
            t.history.push({
                action: `Assigned To ${assign}`,
                by: "User",
                at: nowISO(),
                notes: notes || "Assigned via modal",
            });
        }

        if (status) {
            t.status = status;
            t.history.push({
                action: `Status set to ${status}`,
                by: "User",
                at: nowISO(),
                notes: notes || "",
            });
        }

        t.updatedAt = nowISO();
        await updateTicket(t.firebaseId, t);
        save();
        document.getElementById("modal").classList.add("hidden");
    } catch (error) {
        console.error("Error saving action:", error);
        alert("Error saving action. Check console for details.");
    }
});

// Force handover
document.getElementById("forceHandover").addEventListener("click", async () => {
    const t = tickets.find((x) => x.id === currentModalId);
    if (!t) return alert("No ticket selected");
    const nextDept = document.getElementById("handoverDept").value;
    if (!nextDept) return alert("Choose a department");

    try {
        t.history.push({
            action: `Force Handover ${t.departmentOwner} → ${nextDept}`,
            by: "User",
            at: nowISO(),
            notes: "Forced by user (no notes)",
        });
        t.previousOwner = t.departmentOwner;
        t.departmentOwner = nextDept;
        t.status = "Handed Over";
        t.updatedAt = nowISO();
        await updateTicket(t.firebaseId, t);
        save();
        document.getElementById("modal").classList.add("hidden");
    } catch (error) {
        console.error("Error during force handover:", error);
        alert("Error during force handover. Check console for details.");
    }
});

// Add comment
document.getElementById("addComment").addEventListener("click", async () => {
    const t = tickets.find((x) => x.id === currentModalId);
    if (!t) return alert("No ticket selected");
    const notes = document.getElementById("handoverNotes").value.trim();
    if (!notes) return alert("Comment cannot be empty");

    try {
        t.history.push({ action: "Comment", by: "User", at: nowISO(), notes });
        t.updatedAt = nowISO();
        await updateTicket(t.firebaseId, t);
        save();
        document.getElementById("modal").classList.add("hidden");
    } catch (error) {
        console.error("Error adding comment:", error);
        alert("Error adding comment. Check console for details.");
    }
});

// Search & filter handlers
document
    .getElementById("applyFilter")
    .addEventListener("click", () => applyFilters());
document.getElementById("clearFilter").addEventListener("click", () => {
    document.getElementById("searchText").value = "";
    document.getElementById("filterDept").value = "";
    document.getElementById("filterStatus").value = "";
    renderTickets();
});

function applyFilters() {
    const q = document.getElementById("searchText").value.toLowerCase();
    const dept = document.getElementById("filterDept").value;
    const status = document.getElementById("filterStatus").value;
    const res = tickets.filter((t) => {
        if (dept && t.departmentOwner !== dept) return false;
        if (status && t.status !== status) return false;
        if (q) {
            return (
                t.title +
                " " +
                (t.robotId || "") +
                " " +
                (t.description || "")
            )
                .toLowerCase()
                .includes(q);
        }
        return true;
    });
    renderTickets(res);
}

// Export
document.getElementById("exportBtn").addEventListener("click", () => {
    const data = JSON.stringify(tickets, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robotics_tickets_export.json";
    a.click();
    URL.revokeObjectURL(url);
});

// Seed demo data
document.getElementById("seedDemo").addEventListener("click", async () => {
    const sample = [
        {
            id: uid(),
            title: "Localization drift in Lobby",
            robotId: "RB-1001",
            issueType: "Software",
            priority: "High",
            departmentOwner: "Robotics Software",
            status: "In Progress",
            assignedTo: "A. Khan",
            description: "Robot drifts 0.5m during turns near pillars",
            createdAt: nowISO(),
            updatedAt: nowISO(),
            history: [
                {
                    action: "Created",
                    by: "Field",
                    at: nowISO(),
                    notes: "Observed by field engineer",
                },
            ],
        },
        {
            id: uid(),
            title: "Battery not charging",
            robotId: "RB-1109",
            issueType: "Electronics",
            priority: "Critical",
            departmentOwner: "Robotics Electronics",
            status: "Handover Pending",
            assignedTo: null,
            description:
                "Charging LED not blinking, unit not detected by charger",
            createdAt: nowISO(),
            updatedAt: nowISO(),
            history: [
                {
                    action: "Created",
                    by: "Field",
                    at: nowISO(),
                    notes: "Battery warm and not accepting charge",
                },
            ],
        },
    ];

    try {
        for (const ticket of sample) {
            await saveTicket(ticket);
        }
        tickets = [...sample, ...tickets];
        save();
    } catch (error) {
        console.error("Error seeding demo data:", error);
        alert("Error seeding demo data. Check console for details.");
    }
});

// Analytics
function computeAnalytics() {
    let totalDays = 0;
    let count = 0;
    let handoverCnt = 0;
    let openCnt = 0;
    tickets.forEach((t) => {
        const created = new Date(t.createdAt);
        const resolvedEvent = t.history.find(
            (h) => h.action && h.action.startsWith("Status set to Resolved")
        );
        if (resolvedEvent) {
            totalDays +=
                (new Date(resolvedEvent.at) - created) / (1000 * 60 * 60 * 24);
            count++;
        }
        if (
            t.history.some(
                (h) => h.action && h.action.toLowerCase().includes("handover")
            )
        )
            handoverCnt++;
        if (!["Resolved", "Closed"].includes(t.status)) openCnt++;
    });
    document.getElementById("avgResolution").textContent = count
        ? (totalDays / count).toFixed(1)
        : "—";
    document.getElementById("handoverCount").textContent = handoverCnt;
    document.getElementById("openCount").textContent = openCnt;
}

// Initialize
window.addEventListener("load", () => {
    load();
    computeAnalytics();
});
