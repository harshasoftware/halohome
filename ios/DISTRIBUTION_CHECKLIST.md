# Distribution Checklist - CartoStar

## Manual Steps to Prepare Clean Distribution Repository

### Phase 1: Verify Current Repository

**Check these are present and working:**

- [ ] Project builds successfully (`⌘+B` in Xcode)
- [ ] Tests pass (`⌘+U`)
- [ ] All Packages/ folders present (9 packages)
- [ ] Mintlify docs run (`cd docs-site && mint dev`)
- [ ] No sensitive credentials in committed files
- [ ] Config/Secrets.xcconfig is gitignored (check .gitignore)

### Phase 2: Create Clean Distribution Directory

**Manual steps:**

```bash
# 1. Create distribution directory
cd ~/Documents
mkdir CartoStar
cd CartoStar

# 2. Copy from source (replace SOURCE_PATH with your current repo path)
SOURCE_PATH="/Users/berkinsili/Documents/CartoStar"

# Copy essential directories
cp -R "$SOURCE_PATH/CartoStar" .
cp -R "$SOURCE_PATH/Packages" .
cp -R "$SOURCE_PATH/docs" .
cp -R "$SOURCE_PATH/docs-site" .
cp -R "$SOURCE_PATH/supabase" .
cp -R "$SOURCE_PATH/Config" .
cp -R "$SOURCE_PATH/scripts" .

# Copy root files
cp "$SOURCE_PATH/README.md" .
cp "$SOURCE_PATH/FEATURES.md" .
cp "$SOURCE_PATH/CHANGELOG.md" .
cp "$SOURCE_PATH/DOCUMENTATION_GUIDE.md" .
cp "$SOURCE_PATH/AstroCarto.xcodeproj" . # This needs recursive copy
cp -R "$SOURCE_PATH/AstroCarto.xcodeproj" .
cp "$SOURCE_PATH/.gitignore" .
cp "$SOURCE_PATH/CartoStar.xctestplan" .

# Copy test targets
cp -R "$SOURCE_PATH/AstroCartoTests" .
cp -R "$SOURCE_PATH/AstroCartoUITests" .
```

### Phase 3: Remove Development Artifacts

**Delete these from distribution directory:**

```bash
cd ~/Documents/CartoStar

# Build artifacts
rm -rf .build
rm -rf DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/CartoStar-*

# Test outputs
rm -f coverage-report.html
rm -f coverage-report.txt
rm -f test-output.log
rm -f xcode-test.log

# Xcode user data
rm -rf AstroCarto.xcodeproj/xcuserdata
rm -rf AstroCarto.xcodeproj/project.xcworkspace/xcuserdata

# macOS artifacts
find . -name ".DS_Store" -delete

# Git history (optional - start fresh)
rm -rf .git
```

### Phase 4: Add Distribution-Specific Files

**Create these new files:**

- [ ] `DISTRIBUTION_README.md` (I'll provide content)
- [ ] `LICENSE` (if not already present)
- [ ] Update `.gitignore` to include buyer-specific exclusions

### Phase 5: Verify Distribution Build

**In the distribution directory:**

```bash
cd ~/Documents/CartoStar

# 1. Open project
open AstroCarto.xcodeproj

# 2. In Xcode:
# - File → Packages → Resolve Package Versions
# - Clean Build Folder (⌘⇧K)
# - Build (⌘B) - should succeed
# - Run Tests (⌘U) - should pass

# 3. Verify Packages present
ls -la Packages/
# Should see: AI, Auth, Core, DesignSystem, FeatureChat, FeatureSettings, Networking, Payments, Storage

# 4. Verify docs
ls -la docs/
ls -la docs-site/

# 5. Test Mintlify
cd docs-site
mint dev
# Should open without errors
```

### Phase 6: Create Fresh Git Repository

**Initialize distribution repo:**

```bash
cd ~/Documents/CartoStar

# 1. Create LICENSE file (if needed)
# Add your license text

# 2. Initialize git
git init

# 3. Add all files
git add .

# 4. Initial commit
git commit -m "CartoStar v1.0.0 - Initial Distribution"

# 5. Create GitHub private repository
# Go to GitHub → New Repository → Private
# Name: CartoStar (or your choice)

# 6. Add remote and push
git remote add origin git@github.com:YOURUSERNAME/REPO_NAME.git
git branch -M main
git push -u origin main

# 7. Tag the release
git tag -a v1.0.0 -m "Version 1.0.0 - Initial Release"
git push origin v1.0.0
```

### Phase 7: Set Up Buyer Access

**On GitHub:**

1. **Settings → Collaborators**
   - Add buyer GitHub username
   - Role: Read access only
   
2. **OR Settings → Deploy Keys** (per-buyer)
   - Generate deploy key for each buyer
   - Read-only access
   
3. **OR Use GitHub Sponsors** (if applicable)
   - Private repo access for sponsors

### Phase 8: Test Buyer Experience

**Simulate buyer workflow:**

```bash
# 1. Clone as a buyer would
cd ~/Desktop
git clone git@github.com:YOURUSERNAME/REPO_NAME.git TestBuyerClone
cd TestBuyerClone

# 2. Verify structure
ls -la
# Should see all packages, docs, etc.

# 3. Build and run
open AstroCarto.xcodeproj
# Build (⌘B) - should succeed
# Run (⌘R) - app should work in DEBUG mode

# 4. Read docs
open README.md
open DISTRIBUTION_README.md
cd docs-site && mint dev
```

## Files to Include (Checklist)

### ✅ Essential Code
- [ ] `CartoStar/` - Main app target
- [ ] `Packages/` - ALL 9 packages (critical!)
- [ ] `AstroCartoTests/` - Unit tests
- [ ] `AstroCartoUITests/` - UI tests
- [ ] `AstroCarto.xcodeproj/` - Project file
- [ ] `Config/` - Build configuration (App.xcconfig, Secrets.example.xcconfig)

### ✅ Backend & Scripts
- [ ] `supabase/` - Edge Functions, migrations
- [ ] `scripts/` - Build scripts

### ✅ Documentation
- [ ] `README.md` - GitHub repo intro
- [ ] `DISTRIBUTION_README.md` - **NEW - buyer welcome**
- [ ] `DOCUMENTATION_GUIDE.md` - How to navigate docs
- [ ] `FEATURES.md` - Feature breakdown
- [ ] `CHANGELOG.md` - Version history
- [ ] `docs/` - Complete documentation (36 files)
- [ ] `docs-site/` - Mintlify site (31 pages)

### ✅ Configuration
- [ ] `.gitignore` - Proper exclusions
- [ ] `CartoStar.xctestplan` - Test plan
- [ ] `LICENSE` - Your license terms

### ❌ Exclude (Development Artifacts)
- [ ] `.build/` - Build outputs
- [ ] `DerivedData/` - Xcode build data
- [ ] `coverage-report.*` - Coverage reports
- [ ] `test-output.log`, `xcode-test.log` - Test logs
- [ ] `.DS_Store` - macOS artifacts
- [ ] `xcuserdata/` - User-specific Xcode data
- [ ] `.git/` - Old git history (start fresh)

### ❌ Exclude (Security)
- [ ] `Config/Secrets.xcconfig` - Your personal credentials
- [ ] Any files with real API keys

## Verification Checklist

Before pushing to distribution repo:

- [ ] Project builds in distribution directory
- [ ] Tests pass
- [ ] No personal credentials committed
- [ ] Packages/ folder is complete (9 packages)
- [ ] Documentation is accessible
- [ ] Mintlify runs without errors
- [ ] README.md and DISTRIBUTION_README.md are clear
- [ ] .gitignore is correct
- [ ] LICENSE is present

## Post-Distribution

- [ ] Test buyer clone workflow
- [ ] Create GitHub Release (v1.0.0)
- [ ] Add release notes
- [ ] Update with any buyer feedback

---

**Ready to proceed?** Say yes and I'll create the DISTRIBUTION_README.md content for you.

