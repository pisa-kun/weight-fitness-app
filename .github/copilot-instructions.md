# Project Instructions

This project follows the official AWS AI-DLC v1.0.0 workflow.

- Load and follow `.kiro/steering/aws-aidlc-rules/core-workflow.md` for software-development requests.
- Load the relevant rules from `.kiro/aws-aidlc-rule-details/` before each phase. At workflow start, load the common rules and inspect extension opt-in prompts as required by the core workflow.
- Keep application code at the project root and workflow records under `aidlc-docs/`.
- Put all clarification questions in dedicated files under `aidlc-docs/`; do not ask workflow questions directly in chat. Follow the v1 question format, including `[Answer]:` and a final `X) Other` option.
- Respect approval gates. Do not start implementation until requirements and the execution plan have been reviewed and explicitly approved.
- Keep the selected workflow version at v1.0.0 unless the user explicitly asks to change it.
- Treat body-weight and photo data as sensitive personal data. Do not deploy billable AWS resources or expose the app publicly until the user has approved the account, region, access model, and expected costs.
- Respond to the user in Japanese unless asked otherwise.
