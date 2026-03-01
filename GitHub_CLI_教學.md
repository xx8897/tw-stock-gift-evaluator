# GitHub CLI (`gh`) 完整教學

> GitHub CLI 是 GitHub 官方的命令列工具，讓你不用離開終端機就能操作 GitHub 上的各種功能。

---

## 📦 安裝

| 系統 | 指令 |
|------|------|
| **Windows** | `winget install --id GitHub.cli` |
| **macOS** | `brew install gh` |
| **Linux (Debian/Ubuntu)** | `sudo apt install gh` |

---

## 🔐 1. 登入與驗證

```bash
# 登入 GitHub（互動式，會開瀏覽器驗證）
gh auth login

# 查看目前登入狀態
gh auth status

# 登出
gh auth logout
```

---

## 📁 2. Repo（倉庫）操作

### 建立新 Repo

```bash
# 在當前資料夾建立新的 GitHub repo（互動式）
gh repo create

# 一行搞定：建立公開 repo，名稱為 my-project，並推送現有程式碼
gh repo create my-project --public --source=. --push

# 建立私人 repo
gh repo create my-project --private --source=. --push
```

### Clone Repo

```bash
# 用 GitHub CLI clone（會自動設定 remote）
gh repo clone owner/repo-name

# 範例
gh repo clone microsoft/vscode
```

### 查看 Repo 資訊

```bash
# 在瀏覽器中打開當前 repo 的 GitHub 頁面
gh repo view --web

# 在終端機中查看 repo 資訊
gh repo view

# 列出自己的所有 repos
gh repo list
```

### 刪除 Repo

```bash
# 刪除 repo（會要求確認）
gh repo delete owner/repo-name
```

---

## 🔀 3. Pull Request（PR）操作

```bash
# 建立 PR（互動式）
gh pr create

# 一行搞定：建立 PR 並指定標題與內容
gh pr create --title "修復登入 bug" --body "修正了密碼驗證的邏輯"

# 列出所有 PR
gh pr list

# 查看特定 PR
gh pr view 42

# 在瀏覽器中打開 PR
gh pr view 42 --web

# 合併 PR
gh pr merge 42

# Checkout 別人的 PR 到本地測試
gh pr checkout 42
```

---

## 🐛 4. Issue 操作

```bash
# 建立新 Issue（互動式）
gh issue create

# 一行建立 Issue
gh issue create --title "按鈕無法點擊" --body "首頁的登入按鈕在手機上無法點擊"

# 列出所有 Issue
gh issue list

# 查看特定 Issue
gh issue view 10

# 關閉 Issue
gh issue close 10

# 在瀏覽器中打開 Issue
gh issue view 10 --web
```

---

## ⚡ 5. GitHub Actions（工作流程）

```bash
# 列出所有 workflow 執行記錄
gh run list

# 查看特定執行的詳情
gh run view 123456

# 查看執行的 log
gh run view 123456 --log

# 手動觸發 workflow
gh workflow run deploy.yml

# 列出所有 workflows
gh workflow list
```

---

## 🔑 6. Gist 操作

```bash
# 建立公開 gist
gh gist create myfile.py

# 建立私人 gist
gh gist create myfile.py --public=false

# 列出自己的 gists
gh gist list

# 查看 gist 內容
gh gist view <gist-id>
```

---

## 🔍 7. 搜尋

```bash
# 搜尋 repos
gh search repos "machine learning" --language=python

# 搜尋 Issues
gh search issues "bug" --repo=owner/repo

# 搜尋 PRs
gh search prs "fix" --repo=owner/repo
```

---

## ⚙️ 8. 設定與配置

```bash
# 查看目前的 git protocol 設定（https 或 ssh）
gh config get git_protocol

# 切換為 SSH 協議
gh config set git_protocol ssh

# 切換為 HTTPS 協議
gh config set git_protocol https
```

---

## 🚀 9. 常用實戰範例

### 範例 A：把現有專案上傳到 GitHub

```bash
# 1. 進入專案資料夾（已經 git init 過）
# 2. 建立 repo 並推送
gh repo create my-project --private --source=. --push
```

> 這一行就完成了：建立遠端 repo → 設定 remote → push 所有程式碼 🎉

### 範例 B：Fork 並貢獻開源專案

```bash
# 1. Fork 並 clone 到本地
gh repo fork owner/repo --clone

# 2. 建立新分支、修改程式碼
git checkout -b fix-typo
# ...修改...
git add . && git commit -m "Fix typo in README"
git push -u origin fix-typo

# 3. 建立 PR 回原始 repo
gh pr create --title "Fix typo" --body "修正了 README 中的錯字"
```

### 範例 C：快速查看專案狀態

```bash
# 查看當前 repo 的所有 PR 和 Issue
gh pr list
gh issue list

# 查看 CI/CD 狀態
gh run list
```

---

## 📋 快速對照表

| 用途 | 指令 |
|------|------|
| 登入 | `gh auth login` |
| 建立 repo | `gh repo create` |
| Clone repo | `gh repo clone owner/repo` |
| 建立 PR | `gh pr create` |
| 列出 PR | `gh pr list` |
| 建立 Issue | `gh issue create` |
| 列出 Issue | `gh issue list` |
| 查看 Actions | `gh run list` |
| 在瀏覽器開啟 | `gh repo view --web` |
| 查官方文件 | `gh help` 或 `gh <command> --help` |

---

## 💡 小技巧

1. **任何指令加 `--help`** 都可以看到詳細用法，例如 `gh repo create --help`
2. **加 `--web`** 可以在瀏覽器中打開對應頁面
3. **`gh alias set`** 可以建立自訂快捷指令，例如：
   ```bash
   gh alias set prc 'pr create'
   # 之後只需輸入 gh prc
   ```
4. **`gh api`** 可以直接呼叫 GitHub REST API：
   ```bash
   gh api repos/owner/repo
   ```

---

> 📖 官方文件：[https://cli.github.com/manual/](https://cli.github.com/manual/)
