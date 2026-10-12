# Screenshots for the functional decomposition entries

All taken at 1440x900 from the running system, one browser session per role (the top-right corner shows
that user's name and role). Sample course for every workflow screen: **BIT321L System Integration &
Architecture**, 1st semester SY 2026-2027. Exceptions are noted below.

Where the screen does not match your paragraph, use the **"What the screen really shows"** column to
edit the paragraph. Do not describe a feature the system does not have.

| # | Entry | File | What the screen really shows |
|---|---|---|---|
| 1 | PH: Upload PO and PEO Alignment | `01_PH_Upload_PO_and_PEO_Alignment.png` | **No file upload.** The Program Head edits the PEOs, the UNC-mission check marks, and the PO-to-PEO / graduate-attribute marks in a form (Edit mode) and saves them to the database. |
| 2 | PH: Upload CO and PO Alignment | `02_PH_Upload_CO_and_PO_Alignment.png` | **No file upload.** The CO-to-PO marks (I/E/D) come from the instructor's syllabus; the Program Head reviews them here, read-only. |
| 3 | PH: Upload COAEP Document | `03_PH_Upload_COAEP_Document.png` | **No upload.** The COAEP is generated from the approved syllabus (course BIT213L, approved, Revision 2, because BIT321L is not approved yet at this point). |
| 4 | PH: View and Retrieve Program Documents | `04_PH_View_and_Retrieve_Program_Documents.png` | The generated COAEP opened in the document viewer, with Print and Download PDF. There is no separate document repository page. |
| 5 | PH: Review Learning Plans and Add Comments | `05_PH_Review_Learning_Plans_and_Add_Comments.png` | Course BIT311L (Platform Technologies) because it already has the Program Head's own comments to show. Each approver sees only their own comments. |
| 6 | PH: Approve or Return | `06_PH_Approve_or_Return_Learning_Plans.png` (+ `06b_PH_Return_with_Comments_dialog.png`) | Approve starts a 5-second countdown with Cancel Approval. Return is the "Return with Comments" button of the comment dialog (06b). |
| 7 | PH: Forward Dean Comments to Instructor | `07_PH_Forward_Dean_Comments_to_Instructor.png` | **Not a feature.** The Dean returns a plan with comments and it goes back to the instructor. The file shows the Program Head's Returned list. `07b_PH_Poke_instructor_to_submit.png` shows the Poke button that reminds the instructor to submit. |
| 8 | PH: Endorse Learning Plans to Dean | `08_PH_Endorse_Learning_Plans_to_Dean.png` | **No separate endorse button.** After the Program Head approves, the plan moves to the Dean automatically; the status strip shows "2/3 approved, waiting on Dean". |
| 9 | PH: Track Learning Plan Status | `09_PH_Track_Learning_Plan_Status.png` | The approval status strip: Director of Libraries accepted, Program Head pending, Dean pending. Version history is a separate Revisions page, not in this file. |
| 10 | LD: Manage Textbook References | `10_LD_Manage_Textbook_References.png` | Reference Library filtered to Textbook. |
| 11 | LD: Add OER and Online Resources | `11_LD_Add_OER_and_Online_Resources.png` | Add Reference form with type "Open Educational Resource (OER)". |
| 12 | LD: Review Learning Plan References | `12_LD_Review_Learning_Plan_References.png` | The References section of BIT321L, as seen by the Director of Libraries. |
| 13 | LD: Approve or Flag References | `13_LD_Approve_or_Flag_References.png` | The "Comment & Suggest References" dialog with a flag comment. Approve is the Approve button (same countdown as entry 6). |
| 14 | LD: Suggest Replacement References | `14_LD_Suggest_Replacement_References.png` | The same dialog with a replacement picked from the library; older titles are marked Deprecated. |
| 15 | LD: Source and Add Missing Textbooks | `15_LD_Source_and_Add_Missing_Textbooks.png` | Add Reference form with type Textbook. |
| 16 | IC: Review Learning Plans and Add Comments | `16_IC_Review_Learning_Plans_and_Add_Comments.png` (+ `16b_IC_comment_recorded.png`) | Comment dialog, then the recorded comment. |
| 17 | IC: Approve or Return | `17_IC_Approve_or_Return_Learning_Plans.png` | **The consultant cannot approve or return.** Per the interviews the consultant is outside the approval chain: they can only comment. The toolbar shows only Add Comment. |
| 18 | Dean: Review Learning Plans and Add Comments | `18_Dean_Review_Learning_Plans_and_Add_Comments.png` | The Dean's view after both reviewers accepted (2/3 approved). The Dean sees only their own comments. |
| 19 | Dean: Grant Final Approval | `19_Dean_Grant_Final_Approval.png` (+ `19b_Dean_Approved_status.png`) | Approve countdown, then the plan showing Approved. |
| 20 | Dean: Return with Comments to Program Head | `20_Dean_Return_with_Comments_to_Program_Head.png` | The comment dialog with "Return with Comments". In this system the plan returns to the **instructor**, not to the Program Head. |
| 21 | Dean: View and Export Approved Plans | `21_Dean_View_and_Export_Approved_Learning_Plans.png` + `21b_Dean_Export_menu.png` | Approved tab with Export, then the exported syllabus in the viewer with Download PDF. |
| 22 | VPAA: View Approved Learning Plans | `22_VPAA_View_Approved_Learning_Plans.png` | Read-only list. |
| 23 | VPAA: Search and Filter | `23_VPAA_Search_and_Filter_Learning_Plans.png` | **There is no search box.** The VPAA filters by academic year and semester and sorts by date, code, name or date approved. The file shows school year 2025-2026. |
| 24 | VPAA: Export Approved Learning Plans | `24_VPAA_Export_Approved_Learning_Plans.png` (+ `24a_VPAA_Export_button.png`) | Export button on the approved plan, then the exported syllabus in the viewer. |

## Workflow differences to fix in your paragraphs
- The Director of Libraries and the Program Head review **at the same time**; the Dean acts only after both accept. The
  Industry Consultant is **not** in the chain (comments only).
- Nothing is uploaded for PO/PEO, CO/PO or COAEP in this system; they are edited or generated.

The "Loading dictionary…" note next to Check spelling may still show in a few comment dialogs (13, 14, 16): it is the
spell-check dictionary loading in the development server.
