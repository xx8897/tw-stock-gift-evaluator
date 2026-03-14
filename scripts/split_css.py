import os
import re

CSS_DIR = "css"
COMPONENTS_DIR = os.path.join(CSS_DIR, "components")
COMPONENTS_CSS = os.path.join(CSS_DIR, "components.css")

os.makedirs(COMPONENTS_DIR, exist_ok=True)

with open(COMPONENTS_CSS, "r", encoding="utf-8") as f:
    lines = f.readlines()

blocks = {
    "table.css": [],
    "badges.css": [],
    "buttons.css": [],
    "sections.css": [],
    "user-menu.css": [],
    "history-popup.css": []
}

current_block = "table.css"

for i, line in enumerate(lines):
    # Determine the block based on the line index
    # We will use hardcoded line numbers since we just read the file
    index = i + 1
    
    # 5~171: Table
    # 172-191: step tags -> badges
    # 192~212: highlights (price, cp-value, stock-id) -> table
    # 213~246: badges -> badges
    # 247~345: glass-btn -> buttons
    # 346~401: footer, intro-section -> sections
    # 402-465: strategy cards -> sections
    # 466~569: guide section -> sections
    # 571-594: github star -> buttons
    # 596-697: gift cell & history popup -> history-popup
    # 698-757: freq cell, page jump -> table
    # 758-780: interest-btn -> buttons
    # 781-874: mobile cards -> table
    # 876-930: purchase btn & cell -> table
    # 932-947: login-btn -> buttons
    # 948-1068: user-menu -> user-menu
    # 1070-end: gridlines -> table
    
    if 1 <= index <= 4:
        continue # skip first 4 lines as we will rewrite components.css completely
    elif 5 <= index <= 171:
        current_block = "table.css"
    elif 172 <= index <= 191:
        current_block = "badges.css"
    elif 192 <= index <= 212:
        current_block = "table.css"
    elif 213 <= index <= 246:
        current_block = "badges.css"
    elif 247 <= index <= 345:
        current_block = "buttons.css"
    elif 346 <= index <= 569:
        current_block = "sections.css"
    elif 571 <= index <= 594:
        current_block = "buttons.css"
    elif 596 <= index <= 697:
        current_block = "history-popup.css"
    elif 698 <= index <= 757:
        current_block = "table.css"
    elif 758 <= index <= 780:
        current_block = "buttons.css"
    elif 781 <= index <= 930:
        current_block = "table.css"
    elif 932 <= index <= 947:
        current_block = "buttons.css"
    elif 948 <= index <= 1068:
        current_block = "user-menu.css"
    elif index >= 1070:
        current_block = "table.css"

    blocks[current_block].append(line)


# Write splitted files
for filename, content_lines in blocks.items():
    filepath = os.path.join(COMPONENTS_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(content_lines)

# Write index components.css
with open(COMPONENTS_CSS, "w", encoding="utf-8") as f:
    f.write('/* 聚合各個子模組 (components/...) */\n')
    f.write('@import "toolbar.css";\n')
    f.write('@import "ranking.css";\n')
    for filename in blocks.keys():
        f.write(f'@import "components/{filename}";\n')
        
print("Splitting completed successfully.")
