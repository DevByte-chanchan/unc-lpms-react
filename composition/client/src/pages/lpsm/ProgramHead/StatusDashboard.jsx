// Learning-Plan Status dashboard for the Program Head.
//
// "nasa tracking... learning plan status, that is in Edrian's module" [08:33].
// Uses planStatus.js (the tested single read-model) to show, at a glance:
//   - who has submitted / who has not ("sasaro-saroon ko kada folder" [08:16]),
//   - each plan's stage, and
//   - deadline awareness when an academic calendar is set.
// Pure additive screen: reads the same /api/assignments rows the approval
// table uses and the local workflow store; touches no other module's code.
import React, { useEffect, useState } from "react";
import SkeletonA from "../../../layouts/SkeletonA.jsx";
import HeaderA from "../../../components/HeaderA.jsx";
import SideNavigation from "../../../components/SideNavigation.jsx";
import StatusTracker from "../Shared/StatusTracker.jsx";
import { fetchJson } from "../../../utils/api.js";
import {
  planStatusFor, rollupPlans, nonSubmitters,
  deriveDeadlines, getAcademicCalendar, buildReminders
} from "../../../utils/planStatus.js";
import { getWorkflow } from "../../../utils/workflowHelpers.js";

const getCode = (row) =>
  row.course_no || row.code || row.course_id || row.pc_offering_id || row.course?.code || "-";

const StatusDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [calendar, setCalendar] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const data = await fetchJson("/api/assignments");
        if (live) setAssignments(Array.isArray(data) ? data : []);
      } catch (e) {
        if (live) console.error("Status dashboard could not load assignments:", e);
      }
      setCalendar(getAcademicCalendar());
    })();
    return () => { live = false; };
  }, []);

  // One summary row per course, derived from the tested planStatus read-model.
  const plans = assignments.map((row) => {
    const code = getCode(row);
    const workflow = getWorkflow(code);
    return planStatusFor(code, workflow || {}, {
      name: row.course_name || row.course?.name || row.name || code,
      instructor: row.instructor || row.faculty || ""
    });
  });

  const rolled = rollupPlans(plans);
  const late = nonSubmitters(plans);
  const deadlines = deriveDeadlines(calendar);
  const reminders = buildReminders(plans, deadlines);

  return (
    <SkeletonA
      header={<HeaderA role="Program Head" name="Status" />}
      nav={<SideNavigation mode="program-head" />}
      content={
        <div style={{ padding: "0 30px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h2>Learning Plan Status</h2>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[["Total", rolled.total], ["Submitted", rolled.submitted],
              ["Not submitted", rolled.notSubmitted], ["Returned", rolled.returned],
              ["Approved", rolled.approved]].map(([label, n]) => (
              <div key={label} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "12px 18px", minWidth: 120, textAlign: "center"
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{n}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
              </div>
            ))}
          </div>

          {deadlines && (
            <div style={{ fontSize: 14, color: "#374151", background: "#fff7ed",
              border: "1px solid #fdba74", borderRadius: 8, padding: "10px 14px" }}>
              Syllabus due: <strong>{deadlines.syllabusDue || "—"}</strong>
              &nbsp;·&nbsp; Midterm grades: <strong>{deadlines.midtermGradesDue || "—"}</strong>
              &nbsp;·&nbsp; Finals: <strong>{deadlines.finalGradesDue || "—"}</strong>
            </div>
          )}

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead style={{ background: "#f9fafb", fontWeight: 600 }}>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Course</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Instructor</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Stage</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Submitted</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Approved</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.code} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: 10 }}>{p.instructor || "—"}</td>
                    <td style={{ padding: 10 }}>
                      <StatusTracker status={
                        p.isFullyApproved ? "approved" :
                        p.stage === "returned" ? "returned" :
                        p.submitted ? "submitted" : "draft"
                      } currentStage={p.stage} />
                    </td>
                    <td style={{ padding: 10 }}>{p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: 10, color: p.dateApproved ? "#047857" : "#6b7280" }}>
                      {p.dateApproved ? new Date(p.dateApproved).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
                    No learning plans found.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260, border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Not yet submitted ({late.length})</h3>
              {late.length ? (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {late.map((p) => <li key={p.code}>{p.name} — {p.instructor || "no instructor"}</li>)}
                </ul>
              ) : <p style={{ color: "#047857" }}>Everyone has submitted.</p>}
            </div>
            {reminders.length > 0 && (
              <div style={{ flex: 1, minWidth: 260, border: "1px solid #fde68a", borderRadius: 8, padding: 16, background: "#fffbeb" }}>
                <h3 style={{ marginTop: 0 }}>Reminders</h3>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                  {reminders.map((r) => <li key={r.id}>{r.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

export default StatusDashboard;
