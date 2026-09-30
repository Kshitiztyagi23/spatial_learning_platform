# Context

- **Problem:** Students taking the test had to select answers from Multiple Choice Questions (radio buttons), which didn't perfectly map to the original paper-based Spatial Orientation Test (where users draw a line). 
  **Changes:** Completely removed radio button MCQs from `TestPage.jsx` and `IntroPage.jsx` and built a custom `AnglePicker.jsx` circular slider component. Updated data submission logic to push raw numerical angles to Google Sheets.
  **Why:** To faithfully recreate the original test experience.

- **Problem:** When testing the Angle Picker, the exact angle was displayed to students, which defeated the purpose of intuitively guessing the angle.
  **Changes:** Modified `AnglePicker.jsx` to hide the numerical degree value from the screen. Added a dotted line representing the correct angle that only appears when students click "Check Answer" on the Intro page. 
  **Why:** To ensure students rely purely on their spatial reasoning rather than over-analyzing numerical values.

- **Problem:** We lacked data on participant demographics (Age and Gender).
  **Changes:** Added inputs for Age (number) and Gender (dropdown) to `IntroPage.jsx` and included them in the state mapping. Also updated the `google_script_backend.js` so it writes these new fields as dedicated columns in Google Sheets.
  **Why:** Crucial for stratifying experimental results during analysis.

- **Problem:** The connection to Google Sheets was completely blocked because the URL replacement accidentally triggered a "mock" check in `App.jsx`.
  **Changes:** Removed the `if` block in `App.jsx` that evaluated the `SCRIPT_URL` against the old placeholder string and exited early.
  **Why:** So that `fetch()` is actually invoked and data actually arrives in Google Sheets.

- **Problem:** The 12 question images contained baked-in options which were no longer relevant with the new slider format. The images were replaced with a single `question.png`.
  **Changes:** Updated both `TestPage.jsx` and `IntroPage.jsx` so all `imageSrc` paths explicitly point to `./questions/question.png`.
  **Why:** To maintain visual consistency and remove confusing leftover MCQ text from the UI.

- **Problem:** The example questions in IntroPage displayed an explanatory text under the Correct/Incorrect label, which the user wanted to remove.
  **Changes:** Removed <p>{explanation}</p> from the ExampleQuestion component rendering in IntroPage.jsx.
  **Why:** The visual dotted line serves as sufficient feedback without needing text-based explanations.

- **Problem:** Security audit revealed multiple vulnerabilities including hardcoded Apps Script URL, lack of payload validation, and exploitable anti-cheat mechanics.
  **Changes:** Moved SCRIPT_URL to .env, added a shared secret token, enforced strict server-side validation and deduplication in google_script_backend.js, implemented cross-referencing with sessionStorage for timers, and added CSP/anti-dev-tools measures.
  **Why:** To protect the Google Sheet from spam, prevent manipulation of client-side test metrics, and improve overall repository security hygiene.

- **Problem:** Intro form required users to type grade and section manually, which can lead to inconsistencies.
  **Changes:** Modified IntroPage.jsx to use dropdowns for Grade (Grade 5, Grade 8) and Section, with Section options dynamically updating based on the selected Grade.
  **Why:** To ensure standardized participant data formatting.

- **Problem:** When transitioning between pages (e.g. Intro to Test), the browser maintained the previous scroll position, causing users to skip questions.
  **Changes:** Added a useEffect hook in App.jsx to trigger window.scrollTo(0, 0) whenever currentPage changes.
  **Why:** To ensure each new page starts precisely at the top of the viewport.
