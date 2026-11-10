# Food for Fitness: System Overview

## Purpose

Food for Fitness is a nutrition and wellness application for recording food intake, reviewing nutrition totals, tracking selected health readings, and managing reminders. The app has a web interface and an Android app packaged with Capacitor.

## Official adviser revisions

The adviser-confirmed requirements are implemented in the current scanner:

1. The AI camera scans raw ingredients/materials, then recommends catalog foods that use detected ingredients and shows estimated calories per serving.
2. The scanner validates one dietary food recommendation for each group: **Go**, **Grow**, and **Glow**.

The separate trained AI model is out of scope; Gemini is the intended model for this flow.

## Additional requested revisions

These are other changes the user wants to include in the project plan. They are separate from the adviser's two official requirements and may be confirmed/refined with the adviser.

### Gemini scan output and reliability

- Treat the camera scanner as a suggestion tool: scan raw ingredients, then recommend dietary meals that could be made from them. Scanning alone should not automatically add anything to Food Logs.
- Show one recommendation each for Go, Grow, and Glow. Each suggested meal needs its own estimated calories per serving.
- Choose meal ideas based on the ingredients and what is suitable to make from them. A salad is only an example, not a required or fixed output; for lettuce, the app could suggest a salad, lettuce wraps, or another suitable dietary dish depending on the available ingredients.
- For each suggested meal, show its calorie-contributing ingredients/components and their individual estimated calories, plus that meal's total estimated calories per serving.
- Do not add the calories of alternative meal suggestions together; each recommendation is a separate option with its own total.
- Include a serving/quantity basis for calorie estimates; if an amount cannot be determined from the image, mark it approximate or request user confirmation.
- Show the detected raw ingredients, their Go/Grow/Glow classifications, and estimated overall nutrition (calories, protein, carbs, fat) as applicable.
- Support one or many ingredients in an image, showing each separately and avoiding silent omissions or incorrect descriptions/classifications where possible.
- Treat AI results as estimates; flag uncertain detections for review rather than promising perfect recognition.

### Food options and Food Logs

- Allow suitable meal styles such as salad, appetizer, main dish, or side dish, chosen according to the scanned ingredients rather than forcing one style.
- Keep Food Logs organized under **Go**, **Grow**, and **Glow** only; remove **All Foods**, **Suggestions**, and **Other Foods**.
- Limit the Food Logs options to dietary foods, organized within those three groups. The exact dietary inclusion criteria and food list still need confirmation.
- Add a **Confirm** action when a user adds a food so it is saved to the correct group instead of remaining on the add screen.

### UI and platform experience

- Complete functional changes and test them before the UI overhaul.
- Then improve the UI for both web and Android.
- Use Responsive Web Design on web so layouts adapt between mobile web, tablet, and desktop, including when a desktop browser is resized.
- Keep Android presentation distinct from web/PWA and mobile web where useful, while sharing business logic and services to avoid duplicating functionality.
- Check navigation behavior while scrolling and verify the experience across device sizes.

## Implementation order

1. Implement and validate the official raw-ingredient scanning/recommendation requirement.
2. Ensure the results include one Go, one Grow, and one Glow food, each with estimated calories per serving.
3. Implement and test the additional functional changes: scan result format/review, dietary Food Logs, and food confirmation.
4. Finish the UI overhaul and Responsive Web Design last; verify web and Android behavior afterward.

## Current technology (repository snapshot)

| Area | Current implementation |
|---|---|
| Frontend | React 19, React DOM, JavaScript/JSX |
| Build and development | Vite 8 and `@vitejs/plugin-react` |
| Styling | Tailwind CSS 3, PostCSS, and Autoprefixer |
| Android packaging | Capacitor 8; the native shell loads the built web app |
| Authentication and cloud data | Firebase Authentication and Cloud Firestore |
| AI | Gemini SDK is present; the repository also contains AI/chat code that must be checked and brought into alignment with the revised Gemini-only food-scan scope |
| Notifications | Capacitor Local Notifications on Android and browser notifications on web |
| Local storage | Used for selected caches and guest/device-local state |

This table describes dependencies and code in the repository; it does not assert that production credentials, cloud rules, or deployment services are configured.

## Documentation map

- [Data model](DATA_MODEL.md)
- [System flow](SYSTEM_FLOW.md)
- [Original combined document entry point](DATA_MODEL_AND_SYSTEM_FLOW.md)
