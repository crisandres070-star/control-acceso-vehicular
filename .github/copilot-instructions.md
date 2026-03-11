- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements.
- [x] Scaffold the Project.
- [x] Customize the Project.
- [x] Install Required Extensions. No extensions required.
- [x] Compile the Project.
- [x] Create and Run Task. No dedicated VS Code task was needed because the project uses npm scripts.
- [x] Launch the Project. The app was not auto-launched; use npm run dev when needed.
- [x] Ensure Documentation is Complete.

Project notes:
- Stack: Next.js 14, Tailwind CSS, Prisma ORM, SQLite.
- Roles: ADMIN and USER (security guard).
- Auth: credential-based login backed by environment variables and signed cookie sessions.
- Main commands: npm install, npm run db:push, npm run db:seed, npm run dev, npm run build.
- Admin area: vehicle CRUD, access log browsing, license-plate entry count search, CSV export.
- Guard area: simple license plate input, large access result, automatic access log creation.