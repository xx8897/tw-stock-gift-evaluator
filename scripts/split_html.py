import os

HTML_PATH = "index.html"
COMPONENTS_DIR = "components"

os.makedirs(COMPONENTS_DIR, exist_ok=True)

with open(HTML_PATH, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_html_lines = []
footer_lines = []
nickname_lines = []
ranking_lines = []

for i, line in enumerate(lines):
    idx = i + 1
    
    # 404 - 459: footer
    if 404 <= idx <= 459:
        footer_lines.append(line)
        if idx == 459:
            new_html_lines.append('        <!-- Dynamically loaded footer -->\n')
            new_html_lines.append('        <div id="footerContainer"></div>\n')
    
    # 466 - 495: nicknameModal
    elif 466 <= idx <= 495:
        nickname_lines.append(line)
        if idx == 495:
            new_html_lines.append('    <!-- Dynamically loaded nickname modal -->\n')
            new_html_lines.append('    <div id="nicknameContainer"></div>\n')
            
    # 497 - 511: rankingModal
    elif 497 <= idx <= 511:
        ranking_lines.append(line)
        if idx == 511:
            new_html_lines.append('    <!-- Dynamically loaded ranking modal -->\n')
            new_html_lines.append('    <div id="rankingContainer"></div>\n')
            
    else:
        new_html_lines.append(line)

# Save components
with open(os.path.join(COMPONENTS_DIR, "footer.html"), "w", encoding="utf-8") as f:
    f.writelines(footer_lines)

with open(os.path.join(COMPONENTS_DIR, "nickname-modal.html"), "w", encoding="utf-8") as f:
    f.writelines(nickname_lines)

with open(os.path.join(COMPONENTS_DIR, "ranking-modal.html"), "w", encoding="utf-8") as f:
    f.writelines(ranking_lines)

# Save modified index.html
with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.writelines(new_html_lines)

print("HTML splitting completed.")
