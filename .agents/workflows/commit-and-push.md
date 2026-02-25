---
description: Always remember to commit and push your changes to ensure the remote repository and deployment platforms (Vercel, Render) are up to date.
---

1. Check current changes
```bash
git status
```

2. Add changes to staging
```bash
git add .
```

3. Commit changes with a descriptive message
```bash
git commit -m "feat/fix/refactor: [description of changes]"
```

4. Push to remote repository
// turbo
```bash
git push origin main
```

5. (If backend changes were made) Push to Heroku
If you modified files in the `backend/` directory, you MUST also deploy to Heroku:
// turbo
```bash
git subtree push --prefix backend heroku main
```
