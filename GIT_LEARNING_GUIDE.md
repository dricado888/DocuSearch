# Complete Git & GitHub Learning Guide

**For:** Swastik - Complete beginner to Git/GitHub
**Goal:** Upload DocuSearch Pro to GitHub and understand EVERYTHING about Git

---

## Table of Contents

1. [What is Git? What is GitHub?](#what-is-git-what-is-github)
2. [Why Do We Use Git/GitHub?](#why-do-we-use-gitgithub)
3. [Core Git Concepts](#core-git-concepts)
4. [Essential Git Commands](#essential-git-commands)
5. [Your First Upload (Step-by-Step)](#your-first-upload)
6. [Daily Git Workflow](#daily-git-workflow)
7. [Common Scenarios](#common-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## What is Git? What is GitHub?

### Git (The Tool)

**Git** = Version control system (like "Track Changes" for code, but 1000x better)

**Think of it like:**
- Saving game progress in a video game
- Each "save point" = a **commit**
- Can go back to any previous save
- Multiple people can play (work) at same time

**Created by:** Linus Torvalds (Linux creator) in 2005

**What Git Does:**
1. Tracks every change to your code
2. Shows WHO made WHAT changes WHEN
3. Lets you undo mistakes
4. Enables collaboration without conflicts
5. Works completely offline (on your computer)

---

### GitHub (The Platform)

**GitHub** = Cloud storage + social network for code

**Think of it like:**
- Google Drive but for code
- Instagram but instead of photos, you share projects
- LinkedIn but showing actual work, not just claims

**What GitHub Adds:**
1. **Backup:** Your code is safe in the cloud
2. **Collaboration:** Team members work together
3. **Portfolio:** Employers see your real projects
4. **Open Source:** Access millions of projects
5. **CI/CD:** Automatic testing and deployment

**Alternatives:** GitLab, Bitbucket, SourceForge (GitHub is most popular)

---

## Why Do We Use Git/GitHub?

### 1. Version History (Time Machine)

**Without Git:**
```
my-project.zip
my-project-v2.zip
my-project-final.zip
my-project-FINAL-FINAL.zip
my-project-ACTUALLY-FINAL.zip
```
😱 Which one works? What changed? When?

**With Git:**
```bash
git log
```
```
commit abc123 - "Add RAG improvements" (Jan 4, 2026)
commit def456 - "Fix Unicode encoding" (Jan 4, 2026)
commit ghi789 - "Add API key validation" (Jan 4, 2026)
```
✅ Clear history, can go back to any point!

---

### 2. Collaboration (Team Superhero)

**Without Git:**
```
You: "I changed api.py"
Teammate: "Oh no, I ALSO changed api.py!"
You: "Now what? Who's version do we keep?"
```
😱 Manual merging = nightmare

**With Git:**
```bash
git pull    # Get teammate's changes
git merge   # Git automatically combines changes
```
✅ Git merges automatically, shows conflicts only when truly necessary!

---

### 3. Experimentation (Safe Playground)

**Without Git:**
```
You: "Let me try a crazy new feature..."
*breaks everything*
You: "How do I undo this?!"
*panic*
```
😱 Can't experiment freely

**With Git:**
```bash
git branch experiment    # Create separate timeline
# Try crazy stuff here
git checkout main        # Go back to working code
git merge experiment     # If it worked, merge it in
```
✅ Experiment fearlessly, main code always safe!

---

### 4. Portfolio (Proof of Skills)

**Without GitHub:**
```
Resume: "Proficient in React, Python, AI/ML"
Employer: "Show me proof"
You: "Um... trust me?"
```
😱 Just claims, no evidence

**With GitHub:**
```
Employer: "Show me your work"
You: "github.com/swastiksahoo/docusearch-pro"
Employer: "Wow! RAG system, React, FastAPI, great code!"
```
✅ Tangible proof of skills!

---

### 5. Backup (Disaster Recovery)

**Without GitHub:**
```
*laptop stolen/crashes*
You: "My 6 months of work is GONE!"
```
😱 Permanent loss

**With GitHub:**
```
*laptop stolen/crashes*
You: "No problem"
git clone https://github.com/swastiksahoo/docusearch-pro
```
✅ Code lives forever in the cloud!

---

## Core Git Concepts

### 1. Repository (Repo)

**What:** A folder tracked by Git (your project)

**Types:**
- **Local repo:** On your computer (D:/projects/docusearch-pro/)
- **Remote repo:** On GitHub (github.com/swastiksahoo/docusearch-pro)

**Think of it like:**
- Local repo = Draft on your laptop
- Remote repo = Published blog post everyone can see

---

### 2. Commit

**What:** A "save point" in your project's history

**Contains:**
- Snapshot of all files at that moment
- Message describing what changed
- Author name and timestamp
- Unique ID (hash) like `abc123def456`

**Think of it like:**
- Taking a photo of your code at that moment
- Can look back at that photo anytime

**Good commit message:**
```
✅ "Add API key validation to prevent invalid keys"
```

**Bad commit message:**
```
❌ "stuff"
❌ "changes"
❌ "idk"
```

---

### 3. Working Directory, Staging Area, Repository

**The Three Zones:**

```
Working Directory    →    Staging Area    →    Repository
(Modified files)          (Ready to commit)     (Committed/saved)

     [Edit code]     →    [git add]      →     [git commit]
```

**Example:**

1. **Working Directory:** You edit `api.py` and `rag_engine.py`
2. **Staging Area:** `git add api.py` (mark api.py as "ready to commit")
3. **Repository:** `git commit -m "Fix bug"` (save api.py permanently)

**Why staging area?**
- You edited 10 files but only want to commit 3
- Staging lets you choose EXACTLY what to save

---

### 4. Branch

**What:** Separate timeline of your project

**Default branch:** `main` (or `master` in older repos)

**Visualization:**

```
main:     A---B---C---D
                 \
feature:          E---F---G
```

- `main` = stable, working code
- `feature` = experimental new feature
- If feature works: merge F and G back into main
- If feature fails: delete branch, main is untouched

**Common branch names:**
- `main` - Production code
- `dev` - Development code
- `feature/api-validation` - New feature
- `fix/unicode-bug` - Bug fix
- `experiment/new-ui` - Experiments

---

### 5. Remote

**What:** URL of your GitHub repository

**Common remote names:**
- `origin` - Your GitHub repo (default name)
- `upstream` - Original repo (if you forked someone else's)

**Check remotes:**
```bash
git remote -v
```

**Add remote:**
```bash
git remote add origin https://github.com/swastiksahoo/docusearch-pro.git
```

---

### 6. Push vs Pull

**Push:** Upload your commits to GitHub
```bash
git push origin main
```
"Take my local commits and send them to GitHub"

**Pull:** Download commits from GitHub
```bash
git pull origin main
```
"Get the latest commits from GitHub and update my local code"

**Visual:**

```
Local Computer          GitHub
    [Push →]
    [← Pull]
```

---

## Essential Git Commands

### Setup (One-Time)

**1. Configure your identity:**
```bash
git config --global user.name "Swastik Sahoo"
git config --global user.email "your-email@example.com"
```
Why: Every commit shows who made it

**2. Check configuration:**
```bash
git config --list
```

---

### Daily Commands

**1. Initialize a repo:**
```bash
git init
```
- Run in project folder to start tracking with Git
- Creates hidden `.git` folder

**2. Check status:**
```bash
git status
```
- Shows modified files
- Shows staged files
- Shows untracked files
- **USE THIS CONSTANTLY!**

**3. Add files to staging:**
```bash
git add filename.txt        # Add one file
git add .                   # Add ALL files
git add *.py               # Add all Python files
git add frontend/          # Add entire folder
```

**4. Commit (save):**
```bash
git commit -m "Your message here"
```
- Saves all staged files
- `-m` = message (required)

**5. View history:**
```bash
git log                    # Full history
git log --oneline          # Compact view
git log --graph --oneline  # Visual tree
```

**6. Connect to GitHub:**
```bash
git remote add origin https://github.com/username/repo-name.git
```
- Run once per project
- `origin` = nickname for GitHub URL

**7. Push to GitHub:**
```bash
git push origin main       # Push main branch
git push -u origin main    # First push (sets default)
git push                   # After -u, just this works
```

**8. Pull from GitHub:**
```bash
git pull origin main
git pull                   # If upstream is set
```

**9. Clone (download) a repo:**
```bash
git clone https://github.com/username/repo-name.git
```
- Downloads entire project
- Creates folder automatically

---

### Branch Commands

**1. Create branch:**
```bash
git branch feature-name
```

**2. Switch branch:**
```bash
git checkout feature-name    # Old way
git switch feature-name      # New way (Git 2.23+)
```

**3. Create and switch (shortcut):**
```bash
git checkout -b feature-name  # Old way
git switch -c feature-name    # New way
```

**4. List branches:**
```bash
git branch              # Local branches
git branch -r           # Remote branches
git branch -a           # All branches
```

**5. Merge branch:**
```bash
git checkout main       # Go to main
git merge feature-name  # Merge feature into main
```

**6. Delete branch:**
```bash
git branch -d feature-name    # Safe delete (only if merged)
git branch -D feature-name    # Force delete (even if unmerged)
```

---

### Undo Commands

**1. Unstage file (keep changes):**
```bash
git reset filename.txt
```

**2. Discard changes (DANGEROUS):**
```bash
git checkout -- filename.txt   # Lose all changes to file
git reset --hard               # Lose ALL uncommitted changes
```

**3. Undo last commit (keep changes):**
```bash
git reset --soft HEAD~1
```

**4. Undo last commit (lose changes):**
```bash
git reset --hard HEAD~1
```

**5. Revert a commit (safe way):**
```bash
git revert abc123
```
- Creates NEW commit that undoes abc123
- Doesn't rewrite history

---

## Your First Upload

### Step 1: Create GitHub Account

1. Go to https://github.com
2. Click "Sign Up"
3. Choose username (e.g., `swastiksahoo`)
4. Verify email

---

### Step 2: Create Repository on GitHub

1. Click green "New" button (top left)
2. Repository name: `docusearch-pro`
3. Description: `RAG-powered document Q&A system using FastAPI, React, and Groq`
4. Choose **Public** (for portfolio) or **Private**
5. **DON'T** check "Add README" (we already have code)
6. Click "Create repository"

You'll see:

```bash
git remote add origin https://github.com/swastiksahoo/docusearch-pro.git
git branch -M main
git push -u origin main
```

**Save these commands!** We'll use them.

---

### Step 3: Prepare Your Local Project

**3.1: Check Git status**
```bash
cd D:/projects/docusearch-pro/docusearch-pro
git status
```

**3.2: Create .gitignore (IMPORTANT!)**

**What is .gitignore?**
- Lists files Git should IGNORE
- Don't upload secrets, temporary files, or huge folders

**Why?**
- ❌ Don't upload API keys (security risk!)
- ❌ Don't upload node_modules (500MB, can be reinstalled)
- ❌ Don't upload __pycache__ (Python temporary files)

We'll create this file with proper exclusions.

---

### Step 4: Add All Files

```bash
git add .
```

Stages all files except those in .gitignore

**Check what's staged:**
```bash
git status
```

You should see green files (staged).

---

### Step 5: Create Your First Commit

```bash
git commit -m "Initial commit: DocuSearch Pro - RAG Document Q&A System

Features:
- FastAPI backend with Groq LLM integration
- React frontend with professional F1-inspired design
- RAG system with BAAI/bge embeddings and MMR retrieval
- API key validation
- Unicode encoding fixes for Windows
- Comprehensive documentation

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**What happens:**
- Git saves snapshot of all files
- Creates commit with ID (e.g., `abc123`)
- Records your name, email, timestamp

---

### Step 6: Connect to GitHub

```bash
git remote add origin https://github.com/swastiksahoo/docusearch-pro.git
```

Replace `swastiksahoo` with YOUR GitHub username!

**Check it worked:**
```bash
git remote -v
```

Should show:
```
origin  https://github.com/swastiksahoo/docusearch-pro.git (fetch)
origin  https://github.com/swastiksahoo/docusearch-pro.git (push)
```

---

### Step 7: Push to GitHub

```bash
git push -u origin main
```

**What happens:**
1. Uploads your commit to GitHub
2. Creates `main` branch on GitHub
3. Sets `origin main` as default (next time just `git push`)

**If prompted for credentials:**
- GitHub now requires **Personal Access Token** (PAT)
- Settings → Developer Settings → Personal Access Tokens → Generate new token
- Select: `repo` permissions
- Copy token (save it somewhere!)
- Use token as password when pushing

---

### Step 8: Verify on GitHub

1. Go to https://github.com/swastiksahoo/docusearch-pro
2. You should see all your files!
3. Click around - see your code, README, commits

**🎉 CONGRATULATIONS! Your code is on GitHub!**

---

## Daily Git Workflow

### Scenario 1: Start Your Day

```bash
# 1. Check for updates from team/other devices
git pull

# 2. Start coding...
# Edit files in VS Code

# 3. Check what you changed
git status
git diff                # See exact changes

# 4. Stage your changes
git add .              # Or add specific files

# 5. Commit
git commit -m "Add dark mode toggle to settings"

# 6. Push to GitHub
git push
```

**Frequency:** Commit every 30min - 2 hours (small, focused commits)

---

### Scenario 2: Working on a Feature

```bash
# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Code your feature
# Edit files...

# 3. Commit as you go
git add .
git commit -m "Add login form UI"
# Code more...
git commit -m "Add authentication API endpoint"
# Code more...
git commit -m "Add JWT token validation"

# 4. Switch back to main
git checkout main

# 5. Merge your feature
git merge feature/user-authentication

# 6. Push to GitHub
git push

# 7. Delete feature branch (optional)
git branch -d feature/user-authentication
```

---

### Scenario 3: Made a Mistake

```bash
# Oops, committed wrong files
git reset --soft HEAD~1     # Undo commit, keep changes

# Oops, wrong commit message
git commit --amend -m "Correct message"

# Oops, edited wrong file
git checkout -- wrong-file.py   # Discard changes

# NUCLEAR OPTION: Undo everything
git reset --hard HEAD          # Lose ALL uncommitted changes
```

---

## Common Scenarios

### Scenario A: Employer Wants to See Your Project

**Without GitHub:**
```
You: "I'll email you a ZIP file"
Employer: "Can't open it, corrupted"
*or*
Employer: "Too large for email"
```

**With GitHub:**
```
You: "github.com/swastiksahoo/docusearch-pro"
Employer: *clicks link*
Employer: "Impressive! Hired!"
```

---

### Scenario B: Working on Multiple Computers

**Without Git:**
```
Work laptop: Has version A
Home desktop: Has version B
Confused: Which is newer???
```

**With Git:**
```
Work laptop:
git push

Home desktop:
git pull        # Now same as work laptop!
```

---

### Scenario C: Contributing to Open Source

**How it works:**

1. **Fork** someone's repo (copy to your GitHub)
2. **Clone** your fork to your computer
3. **Create branch** for your feature
4. **Commit** your changes
5. **Push** to your fork
6. **Create Pull Request** (ask original owner to merge)
7. If approved: Your code is in the original project!

**Example:**

```bash
# 1. Fork on GitHub (button on their repo)

# 2. Clone YOUR fork
git clone https://github.com/swastiksahoo/their-project.git

# 3. Create branch
git checkout -b fix/typo-in-docs

# 4. Fix typo, commit
git commit -m "Fix typo in README"

# 5. Push to YOUR fork
git push origin fix/typo-in-docs

# 6. On GitHub: Click "Create Pull Request"
```

---

## Troubleshooting

### Problem 1: "fatal: not a git repository"

**Cause:** You're not in a Git-tracked folder

**Fix:**
```bash
git init
```

---

### Problem 2: "failed to push some refs"

**Cause:** GitHub has commits you don't have locally

**Fix:**
```bash
git pull origin main     # Get their changes first
git push origin main     # Now push yours
```

---

### Problem 3: "merge conflict"

**What happened:** You and teammate edited same line

**How to fix:**

1. Open conflicted file, you'll see:
```python
<<<<<<< HEAD
your_code_here
=======
their_code_here
>>>>>>> branch_name
```

2. Decide what to keep:
```python
# Keep yours, theirs, or combine both
final_code_here
```

3. Remove conflict markers (`<<<<`, `====`, `>>>>`)

4. Commit:
```bash
git add file.py
git commit -m "Resolve merge conflict"
```

---

### Problem 4: "Detached HEAD state"

**Cause:** Checked out a commit instead of a branch

**Fix:**
```bash
git checkout main    # Go back to main branch
```

---

### Problem 5: Accidentally committed secrets (.env file)

**CRITICAL FIX:**

```bash
# 1. Remove from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push
git push origin --force --all

# 3. CHANGE YOUR API KEYS IMMEDIATELY!
# The old keys are in Git history on GitHub servers
```

**Prevention:** Always use .gitignore!

---

## Quick Reference

### Most Used Commands

```bash
git status              # Check status (USE CONSTANTLY!)
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push                # Upload to GitHub
git pull                # Download from GitHub
git log --oneline       # View history
git checkout -b name    # Create and switch to branch
```

---

### Git Workflow Diagram

```
1. EDIT CODE
   ↓
2. git status (check what changed)
   ↓
3. git add . (stage changes)
   ↓
4. git commit -m "message" (save)
   ↓
5. git push (upload to GitHub)
   ↓
6. REPEAT!
```

---

## Summary

**Git = Local version control** (your computer)
**GitHub = Cloud backup + collaboration** (internet)

**Why use it:**
1. ✅ Never lose code
2. ✅ See full history
3. ✅ Undo mistakes easily
4. ✅ Collaborate smoothly
5. ✅ Build portfolio
6. ✅ Contribute to open source

**Essential workflow:**
```bash
git pull        # Start day: get updates
# Code...
git add .       # Stage changes
git commit      # Save snapshot
git push        # Upload to GitHub
```

**Remember:**
- Commit OFTEN (every 30min - 2hrs)
- Write CLEAR commit messages
- Use .gitignore for secrets
- Push at end of each day

---

## Next Steps

1. ✅ Upload DocuSearch Pro (we'll do this together now)
2. 📚 Practice with a test repo
3. 🌟 Add projects to GitHub regularly
4. 🚀 Contribute to open source
5. 💼 Share GitHub on resume/LinkedIn

**Your GitHub profile is your developer resume!**

---

## Resources

- **Official Git Docs:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com
- **Interactive Tutorial:** https://learngitbranching.js.org
- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf
- **Visualizing Git:** https://git-school.github.io/visualizing-git

**You're now ready to use Git like a pro!** 🎯
